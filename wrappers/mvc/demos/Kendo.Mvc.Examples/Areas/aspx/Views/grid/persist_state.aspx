<%@ Page Title="" Language="C#" MasterPageFile="~/Areas/aspx/Views/Shared/Web.Master" 
Inherits="System.Web.Mvc.ViewPage<IEnumerable<Kendo.Mvc.Examples.Models.ProductViewModel>>" %>

<asp:Content ContentPlaceHolderID="MainContent" runat="server">

    <a href="#" class="k-button" id="save">Save State</a>
    <a href="#" class="k-button" id="load">Load State</a>
            
    <%: Html.Kendo().Grid<Kendo.Mvc.Examples.Models.CustomerViewModel>()
        .Name("grid")
        .Columns(columns =>
        {
            columns.Bound(c => c.ContactName).Width(250).Locked(true);
            columns.Bound(c => c.ContactTitle).Width(350);
            columns.Bound(c => c.CompanyName).Width(350);
            columns.Bound(c => c.Country).Width(400);
        })
        .HtmlAttributes(new { style = "height: 550px;" })
        .Scrollable()
        .Groupable()
        .Filterable(ftb=>ftb.Mode(GridFilterMode.Row))
        .Sortable()
        .Resizable(rsb=>rsb.Columns(true))
        .ColumnMenu()
        .Reorderable(r=>r.Columns(true))
        .Pageable(pageable => pageable
            .Refresh(true)
            .PageSizes(true)
            .ButtonCount(5))
        .DataSource(dataSource => dataSource
            .Ajax()
            .PageSize(20)
            .Read(read => read.Action("Customers_Read", "Grid"))
        )
     %>

    <script>    
        $(function () {
            var grid = $("#grid").data("kendoGrid");

            $("#save").click(function (e) {
                e.preventDefault();
                localStorage["kendo-grid-options"] = kendo.stringify(grid.getOptions());
            });

            $("#load").click(function (e) {
                e.preventDefault();
                var options = localStorage["kendo-grid-options"];
                if (options) {
                    grid.setOptions(JSON.parse(options));
                }
            });
        });
    </script>
</asp:Content>
