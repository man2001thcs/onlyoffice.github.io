(function (window, undefined) {
  window.Asc.plugin.init = function () {
    this.executeMethod("AddToolbarMenuItem", [getToolbarItems()]);

    this.executeMethod("ActivateWindow", [
      "asc.{C36DDFB5-08F0-4A68-B829-5FB1F7D49331}",
    ]);

    this.executeMethod("ActivateWindow", [
      "iframe_asc.{C36DDFB5-08F0-4A68-B829-5FB1F7D49331}",
    ]);

    this.attachToolbarMenuClickEvent("insertText", function (data) {
      this.callCommand(function () {
        var oDocument = Api.GetDocument();

        // Create a new paragraph
        var oParagraph = Api.CreateParagraph();

        // Add text to the paragraph
        oParagraph.AddText("ONLYOFFICE Docs 8.1");

        // Style the text as a title
        oParagraph.SetBold(true); // Make the text bold
        oParagraph.SetFontSize(24); // Increase the font size
        oParagraph.SetJc("center"); // Align text to the center

        // Insert the paragraph at the beginning of the document
        oDocument.InsertContent([oParagraph], 0);
      });
    });

    this.attachToolbarMenuClickEvent("insertOleObject", function (data) {
      window.Asc.plugin.executeMethod ("GetInstalledPlugins", null, function (result) {
          postMessage (JSON.stringify ({type: 'InstalledPlugins', data: result }));
      });

      this.executeMethod("ActivateWindow", [
        "asc.{C36DDFB5-08F0-4A68-B829-5FB1F7D49331}",
      ]);
    });

    function getToolbarItems() {
      console.log();
      let items = {
        guid: window.Asc.plugin.info.guid,
        tabs: [
          {
            id: "tab_1",
            text: "Insert options",
            items: [
              {
                id: "insertText",
                type: "button",
                text: "Insert text",
                hint: "insert text into the document",
                icons: "resources/buttons/icon_txt.png",
                lockInViewMode: true,
                enableToggle: false,
                separator: false,
              },
              {
                id: "insertOleObject",
                type: "button",
                text: "Insert OLE Object",
                hint: "Insert an OLE object into the document",
                icons: "resources/buttons/icon_ole.png",
                lockInViewMode: true,
                enableToggle: false,
                separator: false,
              },
            ],
          },
        ],
      };

      return items;
    }
  };
})(window);
