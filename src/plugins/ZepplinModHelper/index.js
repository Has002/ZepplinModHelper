/**
 * @param {import("zerespluginlibrary").Plugin} Plugin 
 * @param {import("zerespluginlibrary").BoundAPI} Api 
 */

module.exports = (Plugin, Api) => {
    const {DOM, ContextMenu, Patcher, Webpack, UI, Utils, React, ReactDOM} = window.BdApi;
    const {DiscordModules, WebpackModules, DiscordClasses, DiscordSelectors, DOMTools, Utilities, Popouts} = Api;

    const PopoutClasses = WebpackModules.getByProps("container", "medium");
    const MarkdownModule = WebpackModules.getByProps("parse", "defaultRules");

    return class ZepplinModHelper extends Plugin {
        constructor() {
            super();

            this.css = require("styles.css");

            this.moderationPopoutHTML = require("moderation_popout.html");
            this.actionButtonsHTML = require("action_buttons.html");
            this.caseHTML = require("case.html");
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