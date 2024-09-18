/**
 *
 * (c) Copyright Ascensio System SIA 2020
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
(function (window, undefined) {
  var flagInit = false;
  var fBtnGetAll = false;
  var ArrContentControls = {};
  var deleteFlag = false;

  var firstGetData = true;

  window.Asc.plugin.init = function () {
    //event "init" from plugin

    document.getElementById("buttonIDPaste").onclick = function () {
      if (!$.isEmptyObject(ArrContentControls) && $(".label-selected").length) {
        var tmpArr = ArrContentControls[$(".label-selected")[0].textContent].id;
        for (var i = 0; i < tmpArr.length; i++) {
          //method for select content control by id
          window.Asc.plugin.executeMethod("SelectContentControl", [tmpArr[i]]);
          //method for paste text into document

          inputPhase = document.getElementById("content").value;
          window.Asc.plugin.executeMethod("PasteText", [inputPhase]);
        }
      } else {
        inputPhase = document.getElementById("content").value;
        window.Asc.plugin.executeMethod("PasteText", [inputPhase]);
      }
    };

    // sample: Refresh list
    document.getElementById("buttonIDGetAll").onclick = function () {
      //method for get all content controls
      window.Asc.plugin.executeMethod("GetAllContentControls");
      fBtnGetAll = true;
    };

    // sample get data by REST API
    document.getElementById("testChangeComboBox").onclick = function () {
      //method for get all content controls
      inputPhase = document.getElementById("comboBoxTag").value;

      // window.Asc.plugin.executeMethod("GetCurrentContentControl");
      getData(inputPhase);
    };

    // first init: get list of tag
    if (!flagInit) {
      flagInit = true;
      //method for get all content controls
      window.Asc.plugin.executeMethod("GetAllContentControls");
    }
  };

  // Get data sample
  getData = (Tag) => {
    var tmpArr = ArrContentControls[Tag].id;

    const url = "https://jsonplaceholder.typicode.com/posts";

    testData = null;

    fetch(url)
      .then((response) => {
        // Check if the response is successful (status code 200-299)
        if (!response.ok) {
          throw new Error("Network response was not ok " + response.statusText);
        }
        return response.json(); // Parse the JSON from the response
      })
      .then((data) => {
        // Handle the data from the response
        console.log(data);

        if (!$.isEmptyObject(ArrContentControls)) {
          for (var i = 0; i < tmpArr.length; i++) {
            testData = data;

            if (testData != null) {
              deleteFlag = true;
              window.Asc.plugin.executeMethod("SelectContentControl", [
                tmpArr[i],
              ]);

              window.Asc.plugin.executeMethod("RemoveContentControl", [
                tmpArr[i],
              ]);

              const formattedArray = testData.map((item, index) => {
                return {
                  Display: index + ". " + item.title,
                  Value: item.body,
                };
              });

              window.Asc.plugin.executeMethod("AddContentControlList", [
                1,
                formattedArray,
                {
                  Id: null,
                  Tag: Tag,
                  Lock: 3,
                },
              ]);
            }
          }
          // window.Asc.plugin.executeMethod("GetAllContentControls");
        }
      })
      .catch((error) => {
        // Handle any errors that occurred during the fetch
        console.error("There was a problem with the fetch operation:", error);
      });
  };

  addLabel = (arrEl, element) => {
    $(element).append(
      $("<label>", {
        id: arrEl.id,
        for: element,
        class: "label-info",
        text: arrEl.tag,
        on: {
          click: function () {
            fClickLabel = true;
            $(".label-selected").removeClass("label-selected");
            $(this).addClass("label-selected");

            window.Asc.plugin.executeMethod("SelectContentControl", [arrEl.id]);
          },
          mouseover: function () {
            $(this).addClass("label-hovered");
          },
          mouseout: function () {
            $(this).removeClass("label-hovered");
          },
        },
      })
    );
  };

  compareArr = (arr) => {
    ArrContentControls = {};
    for (var i = 0; i < arr.length; i++) {
      if (!arr[i].Tag) {
        continue;
      }
      if (ArrContentControls[arr[i].Tag]) {
        ArrContentControls[arr[i].Tag].id.push(arr[i].InternalId);
      } else {
        ArrContentControls[arr[i].Tag] = {
          id: [arr[i].InternalId],
          tag: arr[i].Tag,
          outerid: arr[i].Id,
        };
      }
    }
  };

  window.Asc.plugin.button = function () {
    this.executeCommand("close", "");
  };

  window.Asc.plugin.onMethodReturn = function (returnValue) {
    //evend return for completed methods
    var _plugin = window.Asc.plugin;
    if (_plugin.info.methodName == "GetAllContentControls") {
      compareArr(returnValue);

      // initiate data zone
      if (firstGetData) {
        getData("BOT");

        firstGetData = false;
      }

      fBtnGetAll = false;

      // show tag list
      document.getElementById("divG").innerHTML = "";
      for (const key in ArrContentControls) {
        addLabel(ArrContentControls[key], "#divG");
      }
    } else if (_plugin.info.methodName == "AddContentControlList") {
      window.Asc.plugin.executeMethod("GetAllContentControls");
    } else if (_plugin.info.methodName == "SelectContentControl") {
      window.Asc.plugin.executeMethod("GetCurrentContentControl");
    } else if (_plugin.info.methodName == "GetCurrentContentControl") {
      if (deleteFlag) {
        window.Asc.plugin.executeMethod("PasteText", [""]);
        window.Asc.plugin.executeMethod("RemoveSelectedContent");
        deleteFlag = false;
      }
    }
  };
})(window, undefined);
