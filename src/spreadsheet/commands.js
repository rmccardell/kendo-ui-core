(function(f, define){
    define([
        "../kendo.core",
        "../kendo.binder",
        "../kendo.window",
        "../kendo.list",
        "../kendo.tabstrip"
    ], f);
})(function(){

(function(kendo) {
    if (kendo.support.browser.msie && kendo.support.browser.version < 9) {
        return;
    }

    var $ = kendo.jQuery;

    var Command = kendo.spreadsheet.Command = kendo.Class.extend({
        init: function(options) {
            this.options = options;
            this._workbook = options.workbook;
            this._property = options && options.property;
            this._state = {};
        },
        range: function(range) {
            if (range !== undefined) {
                this._setRange(range);
            }

            return this._range;
        },
        _setRange: function(range) {
            this._range = range;
        },
        redo: function() {
            this.exec();
        },
        undo: function() {
            this.setState(this._state);
        },
        getState: function() {
            this._state = this.range().getState(this._property);
        },
        setState: function(state) {
            this.range().setState(state);
        },
        _forEachCell: function(callback) {
            var range = this.range();
            var ref = range._ref;

            ref.forEach(function(ref) {
                range.sheet().forEach(ref.toRangeRef(), callback.bind(this));
            }.bind(this));
        }
    });

    var TargetValueCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this._target = options.target;
            this._value = options.value;
        },
        exec: function() {
            this.getState();
            this.setState(this._value);
        }
    });

    kendo.spreadsheet.ColumnWidthCommand = TargetValueCommand.extend({
        getState: function() {
            this._state = this.range().sheet().columnWidth(this._target);
        },
        setState: function(state) {
            this.range().sheet().columnWidth(this._target, state);
        }
    });

    kendo.spreadsheet.RowHeightCommand = TargetValueCommand.extend({
        getState: function() {
            this._state = this.range().sheet().rowHeight(this._target);
        },
        setState: function(state) {
            this.range().sheet().rowHeight(this._target, state);
        }
    });

    kendo.spreadsheet.HyperlinkCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this._link = options.link;
        },
        exec: function() {
            var range = this.range();
            this._prevLink = range.link();
            range.link(this._link);
            if (range.value() == null) { // jshint ignore:line
                this._hasSetValue = true;
                range.value(this._link);
            }
        },
        undo: function() {
            var range = this.range();
            range.link(this._prevLink);
            if (this._hasSetValue) {
                range.value(null);
            }
        }
    });

    kendo.spreadsheet.GridLinesChangeCommand = TargetValueCommand.extend({
        getState: function() {
            this._state = this._range.sheet().showGridLines();
        },
        setState: function(v) {
            this._range.sheet().showGridLines(v);
        }
    });

    var PropertyChangeCommand = kendo.spreadsheet.PropertyChangeCommand = Command.extend({
        _setRange: function(range) {
            Command.prototype._setRange.call(this, range.skipHiddenCells());
        },
        init: function(options) {
            Command.fn.init.call(this, options);
            this._value = options.value;
        },
        exec: function() {
            var range = this.range();
            if (range.enable()) {
                this.getState();
                range[this._property](this._value);
            }
        }
    });

    kendo.spreadsheet.ClearContentCommand = Command.extend({
        exec: function() {
            this.getState();
            this.range().clearContent();
        }
    });

    kendo.spreadsheet.EditCommand = PropertyChangeCommand.extend({
        init: function(options) {
            options.property = options.property || "input";
            PropertyChangeCommand.fn.init.call(this, options);
        },
        rejectState: function(validationState) {
            this.undo();

            return {
                title: validationState.title,
                body: validationState.message,
                reason: "error",
                type: "validationError"
            };
        },
        getState: function() {
            this._state = this.range().getState();
        },
        exec: function() {
            var range = this.range();
            var value = this._value;
            this.getState();

            if (this._property == "value") {
                range.value(value);
                return;
            }

            try {
                range.link(null);
                range.input(value);
                range._adjustRowHeight();

                var validationState = range._getValidationState();
                if (validationState) {
                    return this.rejectState(validationState);
                }
            } catch(ex) {
                if (ex instanceof kendo.spreadsheet.calc.ParseError) {
                    return {
                        title : "Error in formula",
                        body  : ex+"",
                        reason: "error"
                    };
                } else {
                    throw ex;
                }
            }
        }
    });

    kendo.spreadsheet.TextWrapCommand = PropertyChangeCommand.extend({
        init: function(options) {
            options.property = "wrap";
            PropertyChangeCommand.fn.init.call(this, options);

            this._value = options.value;
        },
        getState: function() {
            var rowHeight = {};
            this.range().forEachRow(function(range) {
                var index = range.topLeft().row;

                rowHeight[index] = range.sheet().rowHeight(index);
            });

            this._state = this.range().getState(this._property);
            this._rowHeight = rowHeight;
        },
        undo: function() {
            var sheet = this.range().sheet();
            var rowHeight = this._rowHeight;

            this.range().setState(this._state);

            for (var row in rowHeight) {
                sheet.rowHeight(row, rowHeight[row]);
            }
        }
    });

    kendo.spreadsheet.AdjustDecimalsCommand = Command.extend({
        init: function(options) {
            this._decimals = options.value;
            options.property = "format";
            Command.fn.init.call(this, options);
        },
        exec: function() {
            var sheet = this.range().sheet();
            var decimals = this._decimals;
            var formatting = kendo.spreadsheet.formatting;

            this.getState();

            sheet.batch(function() {
                this.range().forEachCell(function(row, col, cell) {
                    var format = cell.format;

                    if (format || decimals > 0) {
                        format = formatting.adjustDecimals(format || "#", decimals);
                        sheet.range(row, col).format(format);
                    }
                });
            }.bind(this));
        }
    });

    kendo.spreadsheet.BorderChangeCommand = Command.extend({
        init: function(options) {
            options.property = "border";
            Command.fn.init.call(this, options);
            this._type = options.border;
            this._style = options.style;
        },
        exec: function() {
            this.getState();
            this[this._type](this._style);
        },
        noBorders: function() {
            var range = this.range();
            range.sheet().batch(function() {
                range.borderLeft(null).borderTop(null).borderRight(null).borderBottom(null);
            }.bind(this), {});
        },
        allBorders: function(style) {
            var range = this.range();
            range.sheet().batch(function() {
                range.borderLeft(style).borderTop(style).borderRight(style).borderBottom(style);
            }.bind(this), {});
        },
        leftBorder: function(style) {
            this.range().leftColumn().borderLeft(style);
        },
        rightBorder: function(style) {
            this.range().rightColumn().borderRight(style);
        },
        topBorder: function(style) {
            this.range().topRow().borderTop(style);
        },
        bottomBorder: function(style) {
            this.range().bottomRow().borderBottom(style);
        },
        outsideBorders: function(style) {
            var range = this.range();
            range.sheet().batch(function() {
                range.leftColumn().borderLeft(style);
                range.topRow().borderTop(style);
                range.rightColumn().borderRight(style);
                range.bottomRow().borderBottom(style);
            }.bind(this), {});
        },
        insideBorders: function(style) {
            this.range().sheet().batch(function() {
                this.allBorders(style);
                this.outsideBorders(null);
            }.bind(this), {});
        },
        insideHorizontalBorders: function(style) {
            var range = this.range();

            range.sheet().batch(function() {
                range.borderBottom(style);
                range.bottomRow().borderBottom(null);
            }.bind(this), {});
        },
        insideVerticalBorders: function(style) {
            var range = this.range();

            range.sheet().batch(function() {
                range.borderRight(style);
                range.rightColumn().borderRight(null);
            }.bind(this), {});
        }
    });

    kendo.spreadsheet.MergeCellCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this._type = options.value;
        },
        exec: function() {
            this.getState();
            this[this._type]();
        },
        activate: function(ref) {
            this.range().sheet().activeCell(ref);
        },
        getState: function() {
            this._state = this.range().getState();
        },
        undo: function() {
            if (this._type !== "unmerge") {
                this.range().unmerge();
                this.activate(this.range().topLeft());
            }
            this.range().setState(this._state);
        },
        cells: function() {
            var range = this.range();
            var ref = range._ref;

            range.merge();
            this.activate(ref);
        },
        horizontally: function() {
            var ref = this.range().topRow()._ref;

            this.range().forEachRow(function(range) {
                range.merge();
            });

            this.activate(ref);
        },
        vertically: function() {
            var ref = this.range().leftColumn()._ref;

            this.range().forEachColumn(function(range) {
                range.merge();
            });

            this.activate(ref);
        },
        unmerge: function() {
            var range = this.range();
            var ref = range._ref.topLeft;

            range.unmerge();
            this.activate(ref);
        }
    });

    kendo.spreadsheet.FreezePanesCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this._type = options.value;
        },
        exec: function() {
            this.getState();
            this._topLeft = this.range().topLeft();
            this[this._type]();
        },
        getState: function() {
            this._state = this.range().sheet().getState();
        },
        undo: function() {
            this.range().sheet().setState(this._state);
        },
        panes: function() {
            var topLeft = this._topLeft;
            var sheet = this.range().sheet();

            sheet.frozenColumns(topLeft.col).frozenRows(topLeft.row);
        },
        rows: function() {
            var topLeft = this._topLeft;
            var sheet = this.range().sheet();

            sheet.frozenRows(topLeft.row);
        },
        columns: function() {
            var topLeft = this._topLeft;
            var sheet = this.range().sheet();

            sheet.frozenColumns(topLeft.col);
        },
        unfreeze: function() {
            var sheet = this.range().sheet();
            sheet.frozenRows(0).frozenColumns(0);
        }
    });

    kendo.spreadsheet.PasteCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this._clipboard = this._workbook.clipboard();
        },
        getState: function() {
            this._range = this._workbook.activeSheet().range(this._clipboard.pasteRef());
            this._state = this._range.getState();
        },
        exec: function() {
            var status = this._clipboard.canPaste();
            this._clipboard.menuInvoked = true;
            if (!status.canPaste) {
                if (status.menuInvoked) {
                    return { reason: "error", type: "useKeyboard" };
                }
                if (status.pasteOnMerged) {
                    return { reason: "error", type: "modifyMerged" };
                }
                if (status.overflow) {
                    return { reason: "error", type: "overflow" };
                }
                return { reason: "error" };
            }
            this.getState();
            this._clipboard.paste();

            var range = this._workbook.activeSheet().range(this._clipboard.pasteRef());
            range._adjustRowHeight();
        }
    });

    kendo.spreadsheet.AdjustRowHeightCommand = Command.extend({
        exec: function() {
            var options = this.options;
            var sheet = this._workbook.activeSheet();
            var range = options.range || sheet.range(options.rowIndex);

            range._adjustRowHeight();
        }
    });

    kendo.spreadsheet.ToolbarPasteCommand = Command.extend({
        exec: function() {
            if (kendo.support.clipboard.paste) {
                this._workbook._view.clipboard.focus().select();
                //reason : focusclipbord
                document.execCommand('paste');
            } else {
                return { reason: "error", type: "useKeyboard" };
            }
        }
    });

    kendo.spreadsheet.CopyCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this._clipboard = options.workbook.clipboard();
        },
        undo: $.noop,
        exec: function() {
            var status = this._clipboard.canCopy();
            this._clipboard.menuInvoked = true;
            if (!status.canCopy) {
                if (status.menuInvoked) {
                    return { reason: "error", type: "useKeyboard" };
                } else if (status.multiSelection) {
                    return { reason: "error", type: "unsupportedSelection" };
                }
                return;
            }
            this._clipboard.copy();
        }
    });

    function copyToClipboard(html) {
        var textarea = document.createElement('textarea');
        $(textarea).addClass("k-spreadsheet-clipboard")
            .val(html)
            .appendTo(document.body)
            .focus()
            .select();

        document.execCommand('copy');

        $(textarea).remove();
    }

    kendo.spreadsheet.ToolbarCopyCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this._clipboard = options.workbook.clipboard();
        },
        undo: $.noop,
        exec: function() {
            if (kendo.support.clipboard.copy) {
                var clipboard = this._workbook._view.clipboard;
                copyToClipboard(clipboard.html());
                clipboard.trigger("copy");
            } else {
                return { reason: "error", type: "useKeyboard" };
            }
        }
    });

    kendo.spreadsheet.CutCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this._clipboard = options.workbook.clipboard();
        },
        exec: function() {
            if (this.range().enable() && this._clipboard.canCopy()) {
                this.getState();
                this._clipboard.cut();
            }
        }
    });

    kendo.spreadsheet.AutoFillCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
        },
        origin: function(origin) {
            this._origin = origin;
        },
        exec: function() {
            this.getState();
            try {
                this.range().fillFrom(this._origin);
            } catch(ex) {
                if (ex instanceof kendo.spreadsheet.Range.FillError) {
                    return { reason: "error", body: ex+"" };
                }
                throw ex;
            }
        }
    });

    kendo.spreadsheet.ToolbarCutCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this._clipboard = options.workbook.clipboard();
        },
        exec: function() {
            if (kendo.support.clipboard.copy) {
                var clipboard = this._workbook._view.clipboard;
                copyToClipboard(clipboard.html());
                clipboard.trigger("cut");
            } else {
                return { reason: "error", type: "useKeyboard" };
            }
        }
    });

    kendo.spreadsheet.FilterCommand = Command.extend({
        undo: function() {
            this.range().filter(this._state);
        },
        exec: function() {
            var range = this.range();

            this._state = range.hasFilter();

            if (range.hasFilter()) {
                range.filter(false);
            } else if (!range.intersectingMerged().length) {
                range.filter(true);
            } else {
               return { reason: "error", type: "filterRangeContainingMerges" };
            }
        }
    });

    kendo.spreadsheet.SortCommand = Command.extend({
        undo: function() {
            var sheet = this.range().sheet();
            sheet.setState(this._state);
        },
        exec: function() {
            var range = this.range();
            var sheet = range.sheet();
            var activeCell = sheet.activeCell();
            var col = this.options.sheet ? activeCell.topLeft.col : (this.options.column || 0);
            var ascending = this.options.value === "asc" ? true : false;

            this._state = sheet.getState();

            if (this.options.sheet) {
                range = this.expandRange();
            }

            if (!range.intersectingMerged().length) {
                range.sort({ column: col, ascending: ascending });
            } else {
                return { reason: "error", type: "sortRangeContainingMerges" };
            }
        },
        expandRange: function() {
            var sheet = this.range().sheet();
            return new kendo.spreadsheet.Range(sheet._sheetRef, sheet);
        }
    });

    var ApplyFilterCommand = kendo.spreadsheet.ApplyFilterCommand = Command.extend({
        column: function() {
            return this.options.column || 0;
        },
        undo: function() {
            var sheet = this.range().sheet();

            sheet.clearFilter(this.column());

            if (this._state.length) {
                this.range().filter(this._state);
            }
        },
        getState: function() {
            var sheet = this.range().sheet();
            var current = sheet.filter();

            if (current) {
                this._state = current.columns.filter(function(c) {
                    return c.index == this.column();
                }.bind(this));
            }
        },
        exec: function() {
            var range = this.range();
            var column = this.column();
            var current = range.sheet().filter();
            var options;
            var filterRule;
            var exists = false;

            if (this.options.valueFilter) {
                filterRule = { column: column, filter: new kendo.spreadsheet.ValueFilter(this.options.valueFilter) };
            } else if (this.options.customFilter) {
                filterRule = { column: column, filter: new kendo.spreadsheet.CustomFilter(this.options.customFilter) };
            }

            this.getState();

            if (current && current.ref.eq(range._ref) && current.columns.length) {
                current.columns.forEach(function(element) {
                    if (element.index === column) {
                        exists = true;
                    }
                });

                options = current.columns.map(function(element) {
                    return element.index === column ? filterRule : { column: element.index, filter: element.filter };
                });

                if (!exists) {
                    options.push(filterRule);
                }
            } else {
                options = filterRule;
            }

            range.filter(options);
        }
    });

    kendo.spreadsheet.ClearFilterCommand = ApplyFilterCommand.extend({
        exec: function() {
            var range = this.range();
            var column = this.column();

            this.getState();
            range.clearFilter(column);
        }
    });

    kendo.spreadsheet.HideLineCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this.axis = options.axis;
        },

        undo: function() {
            var sheet = this.range().sheet();
            sheet.setAxisState(this._state);
        },

        exec: function() {
            var sheet = this.range().sheet();
            this._state = sheet.getAxisState();

            if (this.axis == "row") {
                sheet.axisManager().hideSelectedRows();
            } else {
                sheet.axisManager().hideSelectedColumns();
            }
        }
    });

    kendo.spreadsheet.UnHideLineCommand = kendo.spreadsheet.HideLineCommand.extend({
        exec: function() {
            var sheet = this.range().sheet();
            this._state = sheet.getAxisState();

            if (this.axis == "row") {
                sheet.axisManager().unhideSelectedRows();
            } else {
                sheet.axisManager().unhideSelectedColumns();
            }
        }
    });

    var DeleteCommand = kendo.spreadsheet.DeleteCommand = Command.extend({
        undo: function() {
            var sheet = this.range().sheet();
            sheet.setState(this._state);
        }
    });

    kendo.spreadsheet.DeleteRowCommand = DeleteCommand.extend({
        exec: function() {
            var sheet = this.range().sheet();
            this._state = sheet.getState();
            sheet.axisManager().deleteSelectedRows();
        }
    });

    kendo.spreadsheet.DeleteColumnCommand = DeleteCommand.extend({
        exec: function() {
            var sheet = this.range().sheet();
            this._state = sheet.getState();
            sheet.axisManager().deleteSelectedColumns();
        }
    });

    var AddCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this._value = options.value;
        },
        undo: function() {
            var sheet = this.range().sheet();
            sheet.setState(this._state);
        }
    });

    kendo.spreadsheet.AddColumnCommand = AddCommand.extend({
        exec: function() {
            var sheet = this.range().sheet();
            this._state = sheet.getState();

            if (this._value === "left") {
                sheet.axisManager().addColumnLeft();
            } else {
                sheet.axisManager().addColumnRight();
            }
        }
    });

    kendo.spreadsheet.AddRowCommand = AddCommand.extend({
        exec: function() {
            var sheet = this.range().sheet();

            if (!sheet.axisManager().canAddRow()) {
                return { reason: "error", type: "shiftingNonblankCells" };
            }

            this._state = sheet.getState();

            if (this._value === "above") {
                sheet.axisManager().addRowAbove();
            } else {
                sheet.axisManager().addRowBelow();
            }
        }
    });

    kendo.spreadsheet.EditValidationCommand = Command.extend({
        init: function(options) {
            Command.fn.init.call(this, options);
            this._value = options.value;
        },
        exec: function() {
            this.range().validation(this._value);
        }
    });

    kendo.spreadsheet.OpenCommand = Command.extend({
        cannotUndo: true,
        exec: function() {
            var file = this.options.file;
            if (file.name.match(/.xlsx$/i) === null) {
                return { reason: "error", type: "openUnsupported" };
            }

            this.options.workbook.fromFile(this.options.file);
        }
    });

    kendo.spreadsheet.SaveAsCommand = Command.extend({
        exec: function() {
            var fileName = this.options.name + this.options.extension;
            if (this.options.extension === ".xlsx") {
                this.options.workbook.saveAsExcel({
                    fileName: fileName
                });
            } else if (this.options.extension === ".pdf") {
                this.options.workbook.saveAsPDF($.extend(this.options.pdf, {workbook: this.options.workbook, fileName: fileName}));
            }
        }
    });

})(kendo);

}, typeof define == 'function' && define.amd ? define : function(a1, a2, a3){ (a3 || a2)(); });