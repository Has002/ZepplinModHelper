/**
 * @name ZepplinModHelper
 * @description A BetterDiscord plugin to help accelerate moderator actions with the Zepplin bot.
 * @version 0.1.0
 * @author Obli
 * @authorId 96615490914357248
 * @website https://github.com/Obliie/ZepplinModHelper/tree/master/Releases/ZepplinModHelper
 * @source https://raw.githubusercontent.com/Obliie/ZepplinModHelper/master/Releases/ZepplinModHelper/ZepplinModHelper.plugin.js
 */
/*@cc_on
@if (@_jscript)
    
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/
const config = {
    info: {
        name: "ZepplinModHelper",
        authors: [
            {
                name: "Obli",
                discord_id: "96615490914357248",
                github_username: "Obliie",
                twitter_username: "Obliie"
            }
        ],
        version: "0.1.0",
        description: "A BetterDiscord plugin to help accelerate moderator actions with the Zepplin bot.",
        github: "https://github.com/Obliie/ZepplinModHelper/tree/master/Releases/ZepplinModHelper",
        github_raw: "https://raw.githubusercontent.com/Obliie/ZepplinModHelper/master/Releases/ZepplinModHelper/ZepplinModHelper.plugin.js"
    },
    changelog: [
        {
            title: "Initial Release!",
            items: [
                "Hopefully this works! If there are any issues let me know"
            ]
        }
    ],
    main: "index.js",
    defaultConfig: [
        {
            type: "category",
            id: "config",
            name: "Config",
            collapsible: false,
            shown: true,
            settings: [
                {
                    type: "textbox",
                    id: "bot_user_id",
                    name: "Bot User ID",
                    note: "The user ID for the Zepplin bot",
                    value: ""
                },
                {
                    type: "textbox",
                    id: "bot_channel_id",
                    name: "Bot Channel ID",
                    note: "The channel ID to run commands in.",
                    value: ""
                }
            ]
        }
    ]
};
class Dummy {
    constructor() {this._config = config;}
    start() {}
    stop() {}
}
 
if (!global.ZeresPluginLibrary) {
    BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.name ?? config.info.name} is missing. Please click Download Now to install it.`, {
        confirmText: "Download Now",
        cancelText: "Cancel",
        onConfirm: () => {
            require("request").get("https://betterdiscord.app/gh-redirect?id=9", async (err, resp, body) => {
                if (err) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                if (resp.statusCode === 302) {
                    require("request").get(resp.headers.location, async (error, response, content) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), content, r));
                    });
                }
                else {
                    await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                }
            });
        }
    });
}
 
module.exports = !global.ZeresPluginLibrary ? Dummy : (([Plugin, Api]) => {
     const plugin = (Plugin, Api) => {
    const {DOM, ContextMenu, Patcher, Webpack, UI, Utils, React, ReactDOM} = window.BdApi;
    const {DiscordModules, WebpackModules, DiscordClasses, DiscordSelectors, DOMTools, Utilities, Popouts} = Api;

    const PopoutClasses = WebpackModules.getByProps("container", "medium");
    const MarkdownModule = WebpackModules.getByProps("parse", "defaultRules");

    return class ZepplinModHelper extends Plugin {
        constructor() {
            super();

            this.css = `#popout-moderation-wrapper .header {
    background-color: var(--primary-630);
    border-bottom: 3px solid var(--primary-700);
    padding: 12px 20px;
    z-index: 1;
    color: var(--white-500);
    font-size: 16px;
    font-weight: 700;
    line-height: 19px;
}

/* Upper Section */

#popout-moderation-wrapper .popout-upper {
    height: 500px;
    width: auto;
    flex-direction: row;
    overflow: hidden;
    display: flex;
    flex: 1;
    contain: layout;
    position: relative;
}

.action-side, .chat-side {
    flex-direction: column;
    padding-left: 6px;
}

#popout-moderation-wrapper .scroller {
    contain: layout;
    flex: 1;
    flex-direction: column-reverse;
    min-height: 1px;
    overflow-y: scroll;
    overflow-x: hidden;
    flex: 1 1 auto;
}

/* Actions Side */

#popout-moderation-wrapper .action-side {
    width: auto;
    min-width: 150px;
    background: var(--primary-600);
    flex: 0 0 auto;
    overflow: hidden;
    display: flex;
    min-height: 1px;
    position: relative;
}

#popout-moderation-wrapper .action-radio {
    position: fixed;
    opacity: 0;
    pointer-events: none;
}

#popout-moderation-wrapper .action-button {
    display: flex;
    border-radius: 2px;
    padding: 6px;
    margin: 5px 6px 5px 0px;
    cursor: pointer;
    color: var(--primary-200);
}

#popout-moderation-wrapper .action-button:hover:not(.selected-button) {
    background-color: var(--primary-630);
    color: var(--primary-100);
}

#popout-moderation-wrapper .selected-button {
    background-color: var(--primary-700);
    color: var(--white-500);
}

/* Case Side */

#popout-moderation-wrapper .chat-side {
    width: 350px;
    background-color: var(--primary-560);
    flex: 0 0 auto;
    display: flex;
    min-height: 1px;
    position: relative;
    padding-left: 10px;
}

#popout-moderation-wrapper .user-info-container {
    display: table;
    flex-direction: row;
    color: var(--white-500);
    padding: 4px 10px 4px 4px;
}

#popout-moderation-wrapper .user-info-text {
    display: table-cell;
    vertical-align: middle;
    color: var(--white-500);
}

#popout-moderation-wrapper .button {
    width: auto;
    margin-top: auto;
    margin-bottom: auto;
    border-radius: 3px;
    font-size: 14px;
    padding: 2px 16px;
    float: right;
}

#popout-moderation-wrapper .scroller-title {
    font-weight: 400;
    color: var(--white-500);
    padding: 8px 0 4px 4px;
    margin-right: 8px;
    border-bottom: 1px solid var(--primary-660);
}

/* Lower Section */

#popout-moderation-wrapper .popout-lower {
    display: flex;
    flex-direction: row;
    border-top: 3px solid var(--primary-700);
    background: var(--primary-630);
}

#popout-moderation-wrapper .reason-input {
    background-color: var(--primary-560);
}`;

            this.moderationPopoutHTML = `<div id="popout-moderation-wrapper" class="theme-dark layer-2BGhQ8 popout-moderation-wrapper">
    <div id="popout-moderation" class="{{container}} {{medium}}">
        <div class="header"><div class="title">Moderation</div></div>
        <div class="popout-body">
            <div class="popout-upper">
                <div class="action-side">
                    <span class="scroller-title">Actions</span>
                </div>
                <div class="chat-side">
                    <span class="scroller-title">User Information</span>
                    <div class="user-info-container">
                        <span class="user-info-text">User: {{userId}}</span>
                        <button type="button" class="user-id-copy button lookFilled-1H2Jvj colorBrand-2M3O3N sizeSmall-3R2P2p grow-2T4nbg">
                            Copy
                        </button>
                    </div>
                    <div class="user-info-container">
                        <span class="user-info-text">Message: {{messageId}}</span>
                        <button type="button" class="message-id-copy button lookFilled-1H2Jvj colorBrand-2M3O3N sizeSmall-3R2P2p grow-2T4nbg">
                            Copy
                        </button>
                    </div>
                    <span class="scroller-title">Case Information</span>
                    <div class="case-scroller scroller auto-2TJ1RH scrollerBase-1Pkza4">
                        <div class="cases"></div>
                    </div>
                </div>
            </div>
            <div class="popout-lower">
                <div class="reason-input container-2oNtJn medium-2NClDM">
                    <input id="reason-input" class="input-2m5SfJ" placeholder="Reason" value="">
                </div>
                <button type="button" class="submit-mod-action button lookFilled-1H2Jvj colorBrand-2M3O3N sizeSmall-3R2P2p grow-2T4nbg">
                    Submit
                </button>
            </div>
        </div>
    </div>
</div>`;
            this.actionButtonsHTML = `<div class="action-buttons">
    <label for="note-button">
        <div class="action-button">
            <input type="radio" name="moderation-action" id="note-button" class="action-radio"/>
            <span>Note</span>
        </div>
    </label>
    <label for="warn-button">
        <div class="action-button">
            <input type="radio" name="moderation-action" id="warn-button" class="action-radio"/>
            <span>Warn</span>
        </div>
    </label>
    <div id="mute-buttons" class="mute-buttons">
        <label for="mute-2h-button">
            <div class="action-button">
                <input type="radio" name="moderation-action" id="mute-2h-button" class="action-radio"/>
                <span>Mute 2h</span>
            </div>
        </label>
        <label for="mute-12h-button">
            <div class="action-button">
                <input type="radio" name="moderation-action" id="mute-12h-button" class="action-radio"/>
                <span>Mute 12h</span>
            </div>
        </label>
    </div>
    <div id="ban-buttons" class="ban-buttons">
        <label for="ban-3d-button">
            <div class="action-button">
                <input type="radio" name="moderation-action" id="ban-3d-button" class="action-radio"/>
                <span>Ban 3d</span>
            </div>
        </label>
        <label for="ban-7d-button">
            <div class="action-button">
                <input type="radio" name="moderation-action" id="ban-7d-button" class="action-radio"/>
                <span>Ban 7d</span>
            </div>
        </label>
        <label for="ban-button">
            <div class="action-button">
                <input type="radio" name="moderation-action" id="ban-button" class="action-radio"/>
                <span>Ban</span>
            </div>
        </label>
    </div>
</div>`;
            this.caseHTML = `<div class="case message-2CShn3 cozy-VmLDNB markup-eYLPri messageContent-2t3eCI">{{case}}</div>`;
            this.activePopout = undefined;
            this.casesPopulated = false;

            const om = this.onMessage.bind(this);
            this.onMessage = (e) => {
                try {
                  om(e);
                } catch (e) {
                  console.log("[ZepplinModHelper] Message event error", "\n", e);
                }
            }
        }

        onStart() {
            DOMTools.addStyle(this.name, this.css);
            DiscordModules.Dispatcher.subscribe("MESSAGE_CREATE", this.onMessage);

            // Patch in Discord class names.
            this.moderationPopoutHTML = Utilities.formatString(this.moderationPopoutHTML, {
                container: PopoutClasses.container, 
                medium: PopoutClasses.medium
            });

            this.patchMessageContextMenu();
        }

        onStop() {
            DOMTools.removeStyle(this.name);

            DiscordModules.Dispatcher.unsubscribe("MESSAGE_CREATE", this.onMessage);

            const elements = document.querySelectorAll(".popout-moderation-wrapper");
            for (const el of elements) el && el.remove();
            Patcher.unpatchAll(this.name);
            this.contextMenuPatch?.();
        }

        onMessage({ message }) {
            if (typeof this.activePopout == 'undefined') {
                return;
            }

            if (this.casesPopulated) {
                return;
            }

            if (message.channel_id != this.settings.config.bot_channel_id) {
                return;
            }

            if (message.author.id != this.settings.config.bot_user_id) {
                return;
            }

            // Populate case information in popup.
            if (message.embeds !== undefined && message.embeds.length > 0) {
                const cases = message.embeds
                    .flatMap((embed) => embed.fields)
                    .map((moderationCase, index) => {
                        const parsedMarkdown = MarkdownModule.parse(moderationCase.value, MarkdownModule.defaultRules, { inline:  false});
                        const caseElement = React.createElement("span", {
                            className: "case markup-eYLPri"
                        }, parsedMarkdown);

                        return caseElement;
                    });

                const embedTitle = React.createElement("span", {
                    className: "case markup-eYLPri"
                }, message.embeds[0].author.name);
                const casesToRender = [embedTitle].concat(cases);

                ReactDOM.render(casesToRender, this.activePopout.querySelector(".cases"));
            } else {
                const caseElement = DOMTools.parseHTML(Utilities.formatString(this.caseHTML, {case: "No Cases"}));
                this.activePopout.querySelector(".cases").append(caseElement);
            }

            this.casesPopulated = true;
        }

        patchMessageContextMenu() {
            this.contextMenuPatch = ContextMenu.patch("message", (retVal, props) => {
                const messageId = props.message.id;
                const userId = props.message.author.id;
                const channelId = props.message.channel_id;

                const moderationItem = ContextMenu.buildItem({
                    label: "Moderation",
                    closeOnClick: true,
                    action: (e) => {
                            this.showModerationPopout({
                                getBoundingClientRect() {
                                    return {
                                        top: e.pageY,
                                        bottom: e.pageY,
                                        left: e.pageX,
                                        right: e.pageX
                                    };
                                }
                            }, channelId, messageId, userId);

                            DiscordModules.MessageActions.sendMessage(this.settings.config.bot_channel_id, { content: "?cases " + userId, tts: false, invalidEmojis: [], validNonShortcutEmojis: [] });
                    }
                });

                // Patch in our button.
                const separatorIndex = retVal.props.children.findIndex(k => !k?.props?.label);
                const insertIndex = separatorIndex > 0 ? separatorIndex + 1 : 1;
                retVal.props.children.splice(insertIndex, 0, moderationItem);
            });
        }

        showModerationPopout(target, channelId, messageId, userId) {
            const popout = this.createModerationPopout(channelId, messageId, userId);

            this.activePopout = popout;
            this.showPopout(popout, target);
        }

        createModerationPopout(channelId, messageId, userId) {
            const popout = DOMTools.parseHTML(Utilities.formatString(this.moderationPopoutHTML, {
                messageId: messageId, 
                userId: userId
            }));

            // Add action buttons.
            const actionButtons = DOMTools.createElement(this.actionButtonsHTML);
            actionButtons.addEventListener("click", (e) => {
                // Remove the selected-button class from any actions that currently have it set.
                e.currentTarget.querySelectorAll('.selected-button').forEach(element => {
                  element.classList.remove('selected-button')
                });
              
                // Add the selected-button class to the button which was clicked.
                e.target.closest('.action-button').classList.add('selected-button');
            });
            popout.querySelector(".action-side").append(actionButtons);

            // Create event for user id copy.
            popout.querySelector(".user-id-copy").addEventListener('click', (e) => {
                DiscordNative.clipboard.copy(userId);
            });

            // Create event for message id copy.
            popout.querySelector(".message-id-copy").addEventListener('click', (e) => {
                DiscordNative.clipboard.copy(messageId);
            });

            // Create event for submit.
            popout.querySelector(".submit-mod-action").addEventListener('click', (e) => {
                var action = "";
                var duration = "";
                var reason = document.getElementById('reason-input').value;
                
                // Update action and duration.
                if (document.getElementById('note-button').checked) {
                    action = "note";
                }
                if (document.getElementById('warn-button').checked) {
                    action = "warn";
                }
                if (document.getElementById('mute-2h-button').checked) {
                    action = "mute";
                    duration = "2h";
                }
                if (document.getElementById('mute-12h-button').checked) {
                    action = "mute";
                    duration = "12h";
                }
                if (document.getElementById('ban-3d-button').checked) {
                    action = "ban";
                    duration = "3d";
                }
                if (document.getElementById('ban-7d-button').checked) {
                    action = "ban";
                    duration = "7d";
                }
                if (document.getElementById('ban-button').checked) {
                    action = "ban";
                }

                // Check required parameters.
                if (!action) {
                    console.log("[ZepplinModHelper] No moderation action was selected.")
                    return;
                }
                if (!reason) {
                    console.log("[ZepplinModHelper] No moderation reason was given.")
                    return;
                }

                // Build the command.
                var command = "?"
                command += action + " "  + userId + " ";
                if (duration) {
                    command += duration + " ";
                }
                command += reason;

                // Delete message being moderated, unless the action is adding a note.
                if (action !== "note") {
                    DiscordModules.MessageActions.deleteMessage(channelId, messageId);
                }

                console.log("[ZepplinModHelper] Executing moderation action " + command);
                DiscordModules.MessageActions.sendMessage(this.settings.config.bot_channel_id, { content: command, tts: false, invalidEmojis: [], validNonShortcutEmojis: [] });
            });

            return popout;
        }

        showPopout(popout, relativeTarget) {
            // Close any previous popouts
            if (this.listener) this.listener({target: {classList: {contains: () => {}}, closest: () => {}}});
            
            document.querySelector(`[class*="app-"] ~ ${DiscordSelectors.TooltipLayers.layerContainer}`).append(popout);

            const maxWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const maxHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

            const offset = relativeTarget.getBoundingClientRect();
            if (offset.right + popout.offsetHeight >= maxWidth) {
                popout.style.left = Math.round(offset.left - popout.offsetWidth - 20) + "px";
                const original = Math.round(offset.left - popout.offsetWidth - 20);
                const endPoint = Math.round(offset.left - popout.offsetWidth - 10);
                DOMTools.animate(function(progress) {
                        let value = 0;
                        if (endPoint > original) value = original + (progress * (endPoint - original));
                        else value = original - (progress * (original - endPoint));
                        popout.style.left = value + "px";
                }, 100);
            } else {
                popout.style.left = (offset.right + 10) + "px";
                const original = offset.right + 10;
                const endPoint = offset.right;
                DOMTools.animate(function(progress) {
                        let value = 0;
                        if (endPoint > original) value = original + (progress * (endPoint - original));
                        else value = original - (progress * (original - endPoint));
                        popout.style.left = value + "px";
                }, 100);
            }

            if (offset.top + popout.offsetHeight >= maxHeight) popout.style.top = Math.round(maxHeight - popout.offsetHeight) + "px";
            else popout.style.top = offset.top + "px";

            this.listener = (e) => {
                const target = e.target;

                if (target.classList.contains("submit-mod-action") || (!target.classList.contains("popout-moderation-wrapper") && !target.closest(".popout-moderation-wrapper"))) {
                    this.activePopout = undefined;
                    this.casesPopulated = false;
                    popout.remove();
                    document.removeEventListener("click", this.listener);
                    delete this.listener;
                }
            };
            setTimeout(() => document.addEventListener("click", this.listener), 500);
        }

        getSettingsPanel() {
            const panel = this.buildSettingsPanel();
            panel.addListener(this.updateSettings.bind(this));
            return panel.getElement();
        }

        updateSettings(group, id, value) {
            //no-op
        }
    };

    
};
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/