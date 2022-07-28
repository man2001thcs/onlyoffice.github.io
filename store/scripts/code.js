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

let start = Date.now();
let allPlugins;                                                      // list of all plugins from config
let installedPlugins;                                                // list of intalled plugins
const configUrl = './config.json';                                   // url to config.json
const elements = {};                                                 // all elements
const isDesctop = window.AscDesktopEditor !== undefined;             // desctop detecting
const guidMarkeplace = 'asc.{AA2EA9B6-9EC2-415F-9762-634EE8D9A95E}'; // guid marketplace
const guidSettings = 'asc.{8D67F3C5-7736-4BAE-A0F2-8C7127DC4BB8}';   // guid settings plugins
let isPluginLoading = false;                                         // flag plugins loading
let loader;                                                          // loader
let themeType = detectThemeType();                                   // current theme
const lang = detectLanguage();                                       // current language
const shortLang = lang.split('-')[0];                                // short language
let bTranslate = false;                                              // flag translate or not
let isTranslationLoading = false;                                    // flag translation loading
let isFrameLoading = true;                                           // flag window loading
let translate = {'Loading': 'Loading'};                              // translations for current language (thouse will necessary if we don't get tranlation file)
let timeout = null;                                                  // delay for loader
let defaultBG = themeType == 'light' ? "#F5F5F5" : '#555555';        // default background color for plugin header

// it's necessary because we show loader before all (and getting translations too)
switch (shortLang) {
	case 'ru':
		translate["Loading"] = "Загрузка"
		break;
	case 'fr':
		translate["Loading"] = "Chargement"
		break;
	case 'es':
		translate["Loading"] = "Carga"
		break;
	case 'de':
		translate["Loading"] = "Laden"
		break;
	case 'cs':
		translate["Loading"] = "Načítání"
		break;
}

// it's necessary for loader (because it detects theme by this object)
window.Asc = {
	plugin : {
		theme : {
			type :  themeType
		}
	}
};

// get translation file
getTranslation();
// fetch all plugins from config
fetchAllPlugins();

window.onload = function() {
	// init element
	Ps = new PerfectScrollbar('#' + "div_main", {});
	initElemnts();
	isFrameLoading = false;

	if (shortLang == "en" || (!isPluginLoading && !isTranslationLoading)) {
		// if nothing to translate
		showMarketplace();
	}

	elements.btnMyPlugins.onclick = function(event) {
		// click on my plugins button
		toogleView(event.target, elements.btnMarketplace, 'Install plugin manually', false);
	};

	elements.btnMarketplace.onclick = function(event) {
		// click on marketplace button
		toogleView(event.target, elements.btnMyPlugins, 'Submit your own plugin', true);
	};

	elements.arrow.onclick = function() {
		// click on left arrow in preview mode
		// TODO Fix problem with loading screenshots
		elements.imgScreenshot.setAttribute('src','')
		document.getElementById('span_overview').click();
		elements.divSelected.classList.add('hidden');
		elements.divSelectedMain.classList.add('hidden');
		elements.divBody.classList.remove('hidden');
		elements.arrow.classList.add('hidden');
		Ps.update();
	};

	elements.close.onclick = function() {
		// click on close button
		console.log('close window');
	};

	if (isPluginLoading || isTranslationLoading) {
		toogleLoader(true, "Loading");
	}
};

window.addEventListener('message', function(message) {
	// getting messages from editor or plugin
	message = JSON.parse(message.data);
	let plugin;
	let installed;
	switch (message.type) {
		case 'InstalledPlugins':
			// TODO maybe we should get images as base64 in this method (but we should support theme and scale, maybe send array)
			if (message.data) {
				installedPlugins = message.data.filter(function(el) {
					return (el.guid !== guidMarkeplace && el.guid !== guidSettings);
				});
				sortPlugins(false, true);
			} else {
				installedPlugins = [];
			}

			// console.log('getInstalledPlugins: ' + (Date.now() - start));
			if (allPlugins)
				getAllPluginsData();
			
			break;
		case 'Installed':
			if (!message.guid) {
				// somethimes we can receive such message
				toogleLoader(false);
				return;
			}
			plugin = allPlugins.find(function(el){return el.guid === message.guid});
			installed = installedPlugins.find(function(el){return el.guid === message.guid});
			if (!installed && plugin) {
				installedPlugins.push(
					{
						baseUrl: plugin.url,
						guid: message.guid,
						canRemoved: true,
						obj: plugin,
						removed: false
					}
				);
				sortPlugins(false, true);
			} else if (installed) {
				installed.removed = false;
			}

			let btn = this.document.getElementById(message.guid).lastChild.lastChild;
			btn.innerHTML = translate['Remove'];
			btn.classList.remove('btn_install');
			btn.classList.add('btn_remove');
			btn.onclick = function(e) {
				onClickRemove(e.target, e);
			};

			if (!elements.divSelected.classList.contains('hidden')) {
				this.document.getElementById('btn_install').classList.add('hidden');
				this.document.getElementById('btn_remove').classList.remove('hidden');
			}

			toogleLoader(false);
			break;
		case 'Updated':
			if (!message.guid) {
				// somethimes we can receive such message
				toogleLoader(false);
				return;
			}
			installed = installedPlugins.find(function(el){return el.guid == message.guid});
			plugin = allPlugins.find(function(el){return el.guid === message.guid});

			installed.obj.version = plugin.version;

			if (!elements.divSelected.classList.contains('hidden')) {
				this.document.getElementById('btn_update').classList.add('hidden');
			}

			this.document.getElementById(message.guid).lastChild.firstChild.remove();
			toogleLoader(false);
			break;
		case 'Removed':
			if (!message.guid) {
				// somethimes we can receive such message
				toogleLoader(false);
				return;
			}
			plugin = allPlugins.find(function(el) {return el.guid === message.guid});
			installed = installedPlugins.find(function(el){return el.guid === message.guid});
			if (installed) {
				if (plugin) {
					installedPlugins = installedPlugins.filter(function(el){return el.guid !== message.guid});
				} else {
					installed.removed = true;
				}
			}

			if (elements.btnMyPlugins.classList.contains('btn_toolbar_active')) {
				if (plugin) {
					showListofPlugins(false);
				} else {
					let btn = this.document.getElementById(message.guid).lastChild.lastChild;
					btn.innerHTML = translate['Install'];
					btn.classList.add('btn_install');
					btn.classList.remove('btn_remove');
					btn.onclick = function(e) {
						onClickInstall(e.target, e);
					};
				}
			} else {
				let btn = this.document.getElementById(message.guid).lastChild.lastChild;
				btn.innerHTML = translate['Install'];
				btn.classList.add('btn_install');
				btn.classList.remove('btn_remove');
				btn.onclick = function(e) {
					onClickInstall(e.target, e);
				};
				
				if (btn.parentNode.childElementCount > 1) {
					btn.parentNode.firstChild.remove();
				}
			}

			if (!elements.divSelected.classList.contains('hidden')) {
				this.document.getElementById('btn_remove').classList.add('hidden');
				this.document.getElementById('btn_install').classList.remove('hidden');
				this.document.getElementById('btn_update').classList.add('hidden');
			}

			toogleLoader(false);
			break;
		case 'Error':
			createError(message.error);
			toogleLoader(false);
			break;
		case 'Theme':
			if (message.theme.type)
				themeType = message.theme.type;

			let rule = '\n.asc-plugin-loader{background-color:' + message.theme['background-normal'] +';padding: 10px;display: flex;justify-content: center;align-items: center;border-radius: 5px;}\n';
			rule += 'a{color:'+message.theme.DemTextColor+'!important;}\na:hover{color:'+message.theme.DemTextColor+'!important;}\na:active{color:'+message.theme.DemTextColor+'!important;}\na:visited{color:'+message.theme.DemTextColor+'!important;}\n';

			if (themeType.includes('light')) {
				this.document.getElementsByTagName('body')[0].classList.add('white_bg');
				rule += '.btn_toolbar_active{background-color: #c0c0c0 !important; color: #000 !important}\n';
				rule += '.btn_install{background-color: #444 !important; color: #fff !important}\n';
				rule += '.btn_install:hover{background-color: #1c1c1c !important;}\n';
				rule += '.btn_install:active{background-color: #446995 !important;}\n';
				rule += '.btn_remove:active{background-color: #293f59 !important; color: #fff !important}\n';
				rule += '.div_offered{color: rgba(0,0,0,0.45); !important;}\n';
			} else {
				rule += '.btn_toolbar_active{background-color: #fff !important; color: #000 !important}\n';
				rule += '.btn_install{background-color: #e0e0e0 !important; color: #333 !important}\n';
				rule += '.btn_install:hover{background-color: #fcfcfc !important;}\n';
				rule += '.btn_install:active{background-color: #fcfcfc !important;}\n';
				rule += '.btn_remove:active{background-color: #555 !important; color: rgb(255,255,255,0.8) !important}\n';
				rule += '.div_offered{color: rgba(255,255,255,0.8); !important;}\n';
			}

			let styleTheme = document.createElement('style');
            styleTheme.type = 'text/css';
            styleTheme.innerHTML = message.style + rule;
            document.getElementsByTagName('head')[0].appendChild(styleTheme);
			break;
		case 'onExternalMouseUp':
			let evt = document.createEvent("MouseEvents");
			evt.initMouseEvent("mouseup", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
			document.dispatchEvent(evt);
			break;
		case 'PluginReady':
			// get all installed plugins
			sendMessage({type: 'getInstalled'}, '*');
			break;
	};
}, false);

function getInstalledPluginsImages() {
	// get images as base64 for all intalled plugins
	let count = 0;
	installedPlugins.forEach(function(el, i, arr) {
		// skip if plugin is in maekreplace
		let plugin = allPlugins.find(function(pl){return pl.guid === el.guid}) || allPlugins.find(function(pl){return pl === el.obj.name.toLowerCase()});
		if (plugin)
			return;

		count++;
		let imageUrl = getImageUrl(el.obj, el);
		arr[i].obj.imageUrl = imageUrl;
		// I've removed it so far, since there's no point in uploading pictures if it doesn't work with http://
		// makeRequest(imageUrl, 'blob').then(
		// 	function (res) {
		// 		let reader = new FileReader();
		// 		reader.onloadend = function() {
		// 			arr[i].obj.imageUrl = reader.result;
		// 			count--;
		// 			if (!count) {
		// 				console.log('load all images = ' + (Date.now() - start));
		// 				// if (allPlugins) {
		// 					// getAllPluginsData();
		// 				// }
		// 			}				}
		// 		reader.readAsDataURL(res);
		// 	},
		// 	function(error) {
		// 		createError(error);
		// 	}
		// );
	});
};

function fetchAllPlugins() {
	// function for fetching all plugins from config
	isPluginLoading = true;
	makeRequest(configUrl).then(
		function(response) {
			allPlugins = JSON.parse(response);
			if (installedPlugins)
				getAllPluginsData();
		},
		function(err) {
			createError(new Error('Problem with loading markeplace config.'));
			isPluginLoading = false;
			allPlugins = [];
			showMarketplace();
		}
	);
};

function makeRequest(url, responseType) {
	// this function makes GET request and return promise
	// maybe use fetch to in this function
	// isLoading = true;
	return new Promise(function (resolve, reject) {
		try {
			let xhr = new XMLHttpRequest();
			xhr.open('GET', url, true);
			if (responseType)
				xhr.responseType = responseType;
			
			xhr.onload = function () {
				if (this.readyState == 4) {
					if (this.status == 200 || location.href.indexOf("file:") == 0) {
						resolve(this.response);
					}
					if (this.status >= 400) {
						reject(new Error(this.response));
					}
				}
			};

			xhr.onerror = function (err) {
				reject(err);
			};

			xhr.send(null);
		} catch (error) {
			reject(error);
		}
		
	});
};

function sendMessage(message) {
	// this function sends message to editor
	parent.postMessage(JSON.stringify(message), '*');
};

function detectLanguage() {
	// detect language or return default
	let lang = getUrlSearchValue("lang");
	if (lang.length == 2)
		lang = (lang.toLowerCase() + "-" + lang.toUpperCase());
	return lang || 'en-EN';
};

function detectThemeType() {
	// detect theme or return default
	let type = getUrlSearchValue("theme-type");
	return type || 'light';
};

function initElemnts() {
	elements.btnMyPlugins = document.getElementById('btn_myPlugins');
	elements.btnMarketplace = document.getElementById('btn_marketplace');
	elements.linkNewPlugin = document.getElementById('link_newPlugin');
	elements.divBody = document.getElementById('div_body');
	elements.divMain = document.getElementById('div_main');
	elements.arrow = document.getElementById('arrow');
	elements.close = document.getElementById('close');
	elements.divHeader = document.getElementById('div_header');
	elements.divSelected = document.getElementById('div_selected_toolbar');
	elements.divSelectedMain = document.getElementById('div_selected_main');
	elements.imgIcon = document.getElementById('img_icon');
	elements.spanName = document.getElementById('span_name');
	elements.spanOffered = document.getElementById('span_offered');
	elements.btnUpdate = document.getElementById('btn_update');
	elements.btnRemove = document.getElementById('btn_remove');
	elements.btnInstall = document.getElementById('btn_install');
	elements.spanSelectedDescr = document.getElementById('span_selected_description');
	elements.imgScreenshot = document.getElementById('image_screenshot');
	elements.linkPlugin = document.getElementById('link_plugin');
	elements.divScreen = document.getElementById("div_selected_image");
	elements.divGitLink = document.getElementById('div_github_link');
};

function toogleLoader(show, text) {
	// show or hide loader
	if (!show) {
		clearTimeout(timeout);
		document.getElementById('loader-container').classList.add('hidden');
		loader && (loader.remove ? loader.remove() : $('#loader-container')[0].removeChild(loader));
		loader = undefined;	
	} else if(!loader) {
		document.getElementById('loader-container').classList.remove('hidden');
		loader && (loader.remove ? loader.remove() : $('#loader-container')[0].removeChild(loader));
		loader = showLoader($('#loader-container')[0], (translate[text] || text) + '...');
	}
};

function getAllPluginsData() {
	// get config file for each item in config.json
	getInstalledPluginsImages();
	isPluginLoading = true;
	let count = 0;
	let Unloaded = [];
	let pos = location.href.indexOf('store/index.html');
	let ioUrl = location.href.substring(0, pos) + 'sdkjs-plugins/content/';
	allPlugins.forEach(function(pluginUrl, i, arr) {
		count++;
		pluginUrl = (pluginUrl.indexOf(":/\/") == -1) ? pluginUrl = ioUrl + pluginUrl + '/' : pluginUrl;
		let confUrl = pluginUrl + 'config.json';
		makeRequest(confUrl).then(
			function(response) {
				count--;
				let config = JSON.parse(response);
				config.url = confUrl;
				config.baseUrl = pluginUrl;
				config.imageUrl = getImageUrl(config, null);
				arr[i] = config;
				if (!count) {
					// console.log('getAllPluginsData: ' + (Date.now() - start));
					removeUnloaded(Unloaded);
					sortPlugins(true, false);
					isPluginLoading = false;
					showMarketplace();
				}
			},
			function(err) {
				count--;
				Unloaded.push(i);
				createError(new Error('Problem with loading plugin config.\nConfig: ' + confUrl));
				if (!count) {
					removeUnloaded(Unloaded);
					sortPlugins(true, false);
					isPluginLoading = false;
					showMarketplace();
				}
			}
		);
	})
};

function showListofPlugins(bAll, sortedArr) {
	// show list of plugins
	elements.divMain.innerHTML = "";
	let arr = ( sortedArr ? sortedArr : (bAll ? allPlugins : installedPlugins) );
	if (arr.length) {
		arr.forEach(function(plugin) {
			if (plugin && plugin.guid)
				createPluginDiv(plugin, !bAll);
		});
		setTimeout(function(){Ps.update()});
	} else {
		// if no istalled plugins and my plugins button was clicked
		let notification = bAll ? 'Problem with loading plugins.' : 'No installed plugins.';
		createNotification(translate[notification]);
	}
};

function createPluginDiv(plugin, bInstalled) {
	// console.log('createPluginDiv');
	// this function creates div (preview) for plugins

	let div = document.createElement('div');
	div.id = plugin.guid;
	div.setAttribute('data-guid', plugin.guid);
	div.className = 'div_item form-control noselect';
	
	div.onmouseenter = function(event) {
		event.target.classList.add('div_item_hovered_' + themeType);
	};

	div.onmouseleave = function(event) {
		event.target.classList.remove('div_item_hovered_' + themeType);
	};

	div.onclick = onClickItem;

	let installed = bInstalled ? plugin : installedPlugins.find(function(el){return(el.guid===plugin.guid)});
	let bHasUpdate = false;
	if (isDesctop && installed) {
		const installedV = (installed.obj.version ? installed.obj.version.split('.').join('') : 1);
		const lastV = (plugin.version ? plugin.version.split('.').join('') : installedV);
		if (lastV > installedV)
			bHasUpdate = true;
	}

	if (bInstalled) {
		plugin = allPlugins.find(function(el){
			return el.guid === plugin.guid
		});
	}
		

	if (!plugin) {
		plugin = installed.obj;
	}
	
	let variations = plugin.variations[0]
	// TODO think about when we will get background color for header (maybe from config)
	let name = (bTranslate && plugin.nameLocale && plugin.nameLocale[shortLang]) ? plugin.nameLocale[shortLang] : plugin.name;
	let description = (bTranslate && variations.descriptionLocale && variations.descriptionLocale[shortLang]) ? variations.descriptionLocale[shortLang] : variations.description;
	let bg = variations.store && variations.store.background ? variations.store.background[themeType] : defaultBG;
	let template = '<div class="div_image" style="background-color: ' + bg + '">' +
						// TODO temporarily set the following image sizes
						'<img style="width:56px;" src="' + plugin.imageUrl + '">' +
					'</div>' +
					'<div class="div_description">'+
						'<span class="span_name">' + name + '</span>' +
						'<span class="span_description">' + description + '</span>' +
					'</div>' +
					'<div class="div_footer">' +
						(bHasUpdate
							? '<span class="span_update">' + translate["Update"] + '</span>'
							: ''
						)+''+
						( (installed && !installed.removed)
							? (installed.canRemoved ? '<button class="btn-text-default btn_item btn_remove" onclick="onClickRemove(event.target, event)">' + translate["Remove"] + '</button>' : '<div style="height:20px"></div>')
							: '<button class="btn-text-default btn_item btn_install" onclick="onClickInstall(event.target, event)">'  + translate["Install"] + '</button>'
						)
						+
					'</div>';
	div.innerHTML = template;
	elements.divMain.append(div);
	Ps.update();
};

function onClickInstall(target, event) {
	event.stopImmediatePropagation();
	// click install button
	clearTimeout(timeout);
	timeout = setTimeout(toogleLoader, 200, true, "Installation");
	// toogleLoader(true, "Installation");
	let guid = target.parentNode.parentNode.getAttribute('data-guid');
	let plugin = allPlugins.find( function(el) { return el.guid === guid; } );
	let installed = installedPlugins.find( function(el) { return el.guid === guid; } );
	let message = {
		type : 'install',
		url : (plugin ? plugin.url : installed.baseUrl),
		guid : guid,
		config : plugin || installed.obj
	};
	sendMessage(message);
};

function onClickUpdate(target) {
	// click update button
	clearTimeout(timeout);
	timeout = setTimeout(toogleLoader, 200, true, "Updating");
	// toogleLoader(true, "Updating");
	let guid = target.parentElement.parentElement.parentElement.getAttribute('data-guid');
	let plugin = allPlugins.find( function(el) { return el.guid === guid; } );
	let message = {
		type : 'update',
		url : plugin.url,
		guid : guid,
		config : plugin
	};
	sendMessage(message);
};


function onClickRemove(target, event) {
	event.stopImmediatePropagation();
	// click remove button
	clearTimeout(timeout);
	timeout = setTimeout(toogleLoader, 200, true, "Removal");
	// toogleLoader(true, "Removal");
	let guid = target.parentNode.parentNode.getAttribute('data-guid');
	let message = {
		type : 'remove',
		guid : guid
	};
	sendMessage(message);
};

function onClickItem() {
	// There we will make preview for selected plugin
	// TODO think about where we will get "offered by" and text for this block (maybe from config) (also we should add translate for it)
	let offered = " Ascensio System SIA";
	let description = "Correct French grammar and typography. The plugin uses Grammalecte, an open-source grammar and typographic corrector dedicated to the French language.Correct French grammar and typography."
	
	let guid = this.getAttribute('data-guid');
	let divPreview = document.createElement('div');
	divPreview.id = 'div_preview';
	divPreview.className = 'div_preview';

	let installed = installedPlugins.find(function(el){return(el.guid===guid);});
	let plugin = allPlugins.find(function(el){return (el.guid == guid);});

	if (!plugin) {
		elements.divGitLink.classList.add('hidden');
		plugin = installed.obj;
	} else {
		elements.divGitLink.classList.remove('hidden');
	}

	if (plugin.variations[0].store && plugin.variations[0].store.screenshots) {
		let pos, url;
		if (plugin.imageUrl.includes('defaults')) {
			url = plugin.url.replace('config.json', plugin.variations[0].store.screenshots[0])
		} else {
			pos = plugin.imageUrl.indexOf('resources/');
			url = plugin.imageUrl.substring(0, pos) + plugin.variations[0].store.screenshots[0];
		}
		elements.imgScreenshot.setAttribute('src', url);
		elements.imgScreenshot.classList.remove('hidden');
	} else {
		elements.imgScreenshot.classList.add('hidden');
	}

	let bHasUpdate = false;
	if (isDesctop && installed) {
		let installedV = installed.obj.version.split('.').join('');
		let lastV = plugin.version.split('.').join('');
		if (lastV > installedV)
			bHasUpdate = true;
	}

	let pluginUrl = plugin.baseUrl.replace('https://onlyoffice.github.io/', 'https://github.com/ONLYOFFICE/onlyoffice.github.io/tree/master/');
	
	// TODO problem with plugins icons (different margin from top)
	elements.divSelected.setAttribute('data-guid', guid);
	elements.imgIcon.setAttribute('src', this.children[0].children[0].src);
	elements.spanName.innerHTML = this.children[1].children[0].innerText;
	elements.spanOffered.innerHTML = offered;
	elements.spanSelectedDescr.innerHTML = description;
	elements.linkPlugin.setAttribute('href', pluginUrl);

	if (bHasUpdate) {
		elements.btnUpdate.classList.remove('hidden');
	} else {
		elements.btnUpdate.classList.add('hidden');
	}

	if (installed && !installed.removed) {
		if (installed.canRemoved) {
			elements.btnRemove.classList.remove('hidden');
		} else {
			elements.btnRemove.classList.add('hidden');
		}
		elements.btnInstall.classList.add('hidden');
	} else {
		elements.btnRemove.classList.add('hidden');
		elements.btnInstall.classList.remove('hidden');
	}

	setDivHeight();

	// TODO Fix problem with loading screenshots
	elements.divSelected.classList.remove('hidden');
	elements.divSelectedMain.classList.remove('hidden');
	elements.divBody.classList.add('hidden');
	elements.arrow.classList.remove('hidden');
};

function onSelectPreview(target, isOverview) {
	// change mode of preview
	if ( !target.classList.contains('span_selected') ) {
		$(".span_selected").removeClass("span_selected");
		target.classList.add("span_selected");

		if (isOverview) {
			document.getElementById('div_selected_info').classList.add('hidden');
			document.getElementById('div_selected_preview').classList.remove('hidden');
			setDivHeight();
		} else {
			document.getElementById('div_selected_preview').classList.add('hidden');
			document.getElementById('div_selected_info').classList.remove('hidden');
		}
	}
};

function createNotification(text) {
	// creates any notification for user inside elements.divMain window (you should clear this element before making notification)
	let div = document.createElement('div');
	div.className = 'div_notification';
	let span = document.createElement('span');
	span.className = 'span_notification';
	span.innerHTML = translate[text] || text;
	div.append(span);
	elements.divMain.append(div);
};

function createError(err) {
	// creates a modal window with error message for user and error in console
	console.error(err);
	let background = document.createElement('div');
	background.className = 'asc-plugin-loader';
	let span = document.createElement('span');
	span.className = 'error_caption';
	span.innerHTML = err.message;
	background.append(span);
	document.getElementById('div_error').append(background);
	document.getElementById('div_error').classList.remove('hidden');
	setTimeout(function() {
		// remove error after 5 seconds
		background.remove();
		document.getElementById('div_error').classList.add('hidden');
	}, 5000);
};

function setDivHeight() {
	// set height for div with image in preview mode
	if (Ps) Ps.update();
	// console.log(Math.round(window.devicePixelRatio * 100));
	if (elements.divScreen) {
		let height = elements.divScreen.parentNode.clientHeight - elements.divScreen.previousElementSibling.clientHeight - 40 + "px";
		elements.divScreen.style.height = height;
		elements.divScreen.style.maxHeight = height;
	}
};

window.onresize = function() {
	setDivHeight();
	// TODO change icons for plugins preview for new scale
};

function getTranslation() {
	// gets translation for current language
	if (shortLang != "en") {
		isTranslationLoading = true
		makeRequest('./translations/langs.json').then(
			function(response) {
				let arr = JSON.parse(response);
				let fullName, shortName;
				for (let i = 0; i < arr.length; i++) {
					let file = arr[i];
					if (file == lang) {
						fullName = file;
						break;
					} else if (file.split('-')[0] == shortLang) {
						shortName = file;
					}
				}
				if (fullName || shortName) {
					bTranslate = true;
					makeRequest('./translations/' + (fullName || shortName) + '.json').then(
						function(res) {
							// console.log('getTranslation: ' + (Date.now() - start));
							translate = JSON.parse(res);
							onTranslate();
						},
						function(err) {
							createError(new Error('Cannot load translation for current language.'));
							createDefaultTranslations();
						}
					);
				} else {
					createDefaultTranslations();
				}	
			},
			function(err) {
				createError(new Error('Cannot load translations list file.'));
				createDefaultTranslations();
			}
		);
	} else {
		createDefaultTranslations();
	}
};

function onTranslate() {
	isTranslationLoading = false;
	// translates elements on current language
	elements.linkNewPlugin.innerHTML = translate["Submit your own plugin"];
	elements.btnMyPlugins.innerHTML = translate["My plugins"];
	elements.btnMarketplace.innerHTML = translate["Marketplace"];
	elements.btnInstall.innerHTML = translate['Install'];
	elements.btnRemove.innerHTML = translate["Remove"];
	elements.btnUpdate.innerHTML = translate["Update"];
	document.getElementById('lbl_header').innerHTML = translate['Manage plugins'];
	document.getElementById('span_offered_caption').innerHTML = translate['Offered by'] + ': ';
	document.getElementById('span_overview').innerHTML = translate['Overview'];
	document.getElementById('span_info').innerHTML = translate['Info & Support'];
	document.getElementById('span_lern').innerHTML = translate['Learn how to use'] + ' ';
	document.getElementById('span_lern_plugin').innerHTML = translate['the plugin in'] + ' ';
	document.getElementById('span_contribute').innerHTML = translate['Contribute'] + ' ';
	document.getElementById('span_contribute_end').innerHTML = translate['to the plugin developmen or report an issue on'] + ' ';
	document.getElementById('span_help').innerHTML = translate['Get help'] + ' ';
	document.getElementById('span_help_end').innerHTML = translate['with the plugin functionality on our forum.'];
	document.getElementById('span_create').innerHTML = translate['Create a new plugin using'] + ' ';
	showMarketplace();
};

function showMarketplace() {
	// show main window to user
	if (!isPluginLoading && !isTranslationLoading && !isFrameLoading) {
		showListofPlugins(true);
		toogleLoader(false);

	
		elements.divBody.classList.remove('hidden');
		// console.log('showMarketplace: ' + (Date.now() - start));
		// we are removing the header for now, since the plugin has its own
		// elements.divHeader.classList.remove('hidden');
	}
};

function getImageUrl(plugin, installed) {
	// get image url for current plugin
	// TODO solve the issue with scale to select the appropriate icon
	let imageUrl;
	if ( installed && ( installed.baseUrl.includes('http://') || installed.baseUrl.includes('file:') ) ) {
		imageUrl = './resources/img/defaults/' + themeType + '/icon@2x.png';
	} else {
		if (plugin.baseUrl.includes('://')) {
			imageUrl = plugin.baseUrl;
		} else {
			let temp = plugin.baseUrl.replace(/\.\.\//g, '');
			let endpos = installed.baseUrl.indexOf('/', 9) + 1;
			imageUrl = installed.baseUrl.slice(0, endpos) + temp;
		}
		
		let variations = plugin.variations[0];
		if (variations.icons2) {
			let icon = variations.icons2[0];
			for (let i = 0; i < variations.icons2.length; i++) {
				if (themeType.includes(variations.icons2[i].style)) {
					icon = variations.icons2[i];
					break;
				}
			}
			imageUrl += icon['200%'].normal;
		} else if (!variations.isSystem && imageUrl != '') {
			let icon = variations.icons[0];
			if (typeof(icon) == 'object') {
				for (let i = 0; i < variations.icons.length; i++) {
					if (themeType.includes(variations.icons[i].style)) {
						icon = variations.icons[i];
						break;
					}
				}
				imageUrl += icon['200%'].normal;
			} else {
				imageUrl += variations.icons[0];
			}
		} else {
			imageUrl = './resources/img/defaults/' + themeType + '/icon@2x.png';
		}
	}
	return imageUrl;
};

function getUrlSearchValue(key) {
	let res = '';
	if (window.location && window.location.search) {
		let search = window.location.search;
		let pos1 = search.indexOf(key + '=');
		if (-1 != pos1) {
			pos1 += key.length + 1;
			let pos2 = search.indexOf("&", pos1);
			res = search.substring(pos1, (pos2 != -1 ? pos2 : search.length) )
		}
	}
	return res;
};

function toogleView(current, oldEl, text, bAll) {
	if ( !current.classList.contains('btn_toolbar_active') ) {
		oldEl.classList.remove('btn_toolbar_active');
		current.classList.add('btn_toolbar_active');
		elements.linkNewPlugin.innerHTML = translate[text] || text;
		showListofPlugins(bAll);
	}
};

function sortPlugins(bAll, bInst) {
	if (bAll) {
		allPlugins.sort(function(a, b) {
			return a.name.localeCompare(b.name);
		});
	}
	if (bInst) {
		installedPlugins.sort(function(a, b) {
			return a.obj.name.localeCompare(b.obj.name);
		});
	}
};

function createDefaultTranslations() {
	translate = {
		"Submit your own plugin": "Submit your own plugin",
		"Install plugin manually": "Install plugin manually",
		"Install": "Install",
		"Remove": "Remove",
		"Update": "Update",
	};
	isTranslationLoading = false;
	showMarketplace();
};

function removeUnloaded(unloaded) {
	unloaded.forEach(function(el){
		allPlugins.splice(el, 1);
	})
};