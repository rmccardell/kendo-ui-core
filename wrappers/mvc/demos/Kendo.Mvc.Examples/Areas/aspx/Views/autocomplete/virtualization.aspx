<%@ Page Title="" Language="C#" MasterPageFile="~/Areas/aspx/Views/Shared/Web.Master" Inherits="System.Web.Mvc.ViewPage<dynamic>" %>

<asp:Content ContentPlaceHolderID="HeadContent" runat="server">
</asp:Content>

<asp:Content ContentPlaceHolderID="MainContent" runat="server">
<div class="demo-section">
    <h4>Orders</h4>

    <%= Html.Kendo().AutoComplete()
          .Name("orders")
          .DataTextField("ShipName")
          .MinLength(3)
          .HtmlAttributes(new { style = "width:450px" })
          .Placeholder("Type a ship name")
          .Template("#= OrderID # | For: #= ShipName #, #= ShipCountry #")
          .Height(520)
          .DataSource(source => {
              source.Custom()
                  .ServerFiltering(true)
                  .ServerPaging(true)
                  .PageSize(80)
                  .Type("aspnetmvc-ajax") //Set this type if you want to use DataSourceRequest and ToDataSourceResult instances
                  .Transport(transport =>
                  {
                      transport.Read("Virtualization_Read", "AutoComplete");
                  })
                  .Schema(schema =>
                  {
                      schema.Data("Data") //define the [data](http://docs.telerik.com/kendo-ui/api/javascript/data/datasource#configuration-schema.data) option
                            .Total("Total"); //define the [total](http://docs.telerik.com/kendo-ui/api/javascript/data/datasource#configuration-schema.total) option
                  });
          })
          .Virtual(v => v.ItemHeight(26).ValueMapper("valueMapper"))
    %>
</div>
<style>
    .demo-section {
        width: 450px;
        margin: 35px auto 50px;
        padding: 30px;
    }
    .demo-section h2 {
        text-transform: uppercase;
        font-size: 1.2em;
        margin-bottom: 10px;
    }
</style>
<script>
    function valueMapper(options) {
        $.ajax({
            url: "http://demos.telerik.com/kendo-ui/service/Orders/ValueMapper",
            type: "GET",
            data: convertValues(options.value),
            success: function (data) {
                options.success(data);
            }
        });
    }

    function convertValues(value) {
        var data = {};

        value = $.isArray(value) ? value : [value];

        for (var idx = 0; idx < value.length; idx++) {
            data["values[" + idx + "]"] = value[idx];
        }

        return data;
    }
</script>
</asp:Content>