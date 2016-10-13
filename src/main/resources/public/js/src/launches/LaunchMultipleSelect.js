/*
 * This file is part of Report Portal.
 *
 * Report Portal is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Report Portal is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Report Portal.  If not, see <http://www.gnu.org/licenses/>.
 */
define(function (require, exports, module) {
    'use strict';

    var SingletonLaunchFilterCollection = require('filters/SingletonLaunchFilterCollection');

    var $ = require('jquery');
    var _ = require('underscore');
    var Backbone = require('backbone');
    var Epoxy = require('backbone-epoxy');
    var App = require('app');
    var LaunchSuiteStepItemModel = require('launches/common/LaunchSuiteStepItemModel');
    var Util = require('util');
    var MergeAction = require('launches/multipleActions/mergeAction');
    var CompareAction = require('launches/multipleActions/compareAction');
    var RemoveAction = require('launches/multipleActions/removeAction');
    var MoveToDebugAction = require('launches/multipleActions/moveToDebugAction');

    var config = App.getInstance();

    var LaunchMultipleSelectItem = Epoxy.View.extend({
        className: 'multi-select-item',
        template: 'tpl-launch-multiple-selected-item',

        events: {
            'click [data-ja-close-item]': 'onClickClose',
        },

        bindings: {
            '[data-js-item-name]': 'text: format("$1$2", name, numberText)',
            ':el': 'attr: {title: invalidMessage}, classes: {"error-validate": invalidMessage}',
        },

        initialize: function() {
            this.render();
            this.listenTo(this.model, 'remove', this.destroy);
        },
        render: function() {
            this.$el.html(Util.templates(this.template, {}));
        },
        onClickClose: function() {
            this.model.set({select: false});
        },
        destroy: function () {
            this.$el.remove();
            this.undelegateEvents();
            this.stopListening();
            this.unbind();
            delete this;
        },
    });

    var SelectedItemsCollection = Backbone.Collection.extend({
        model: LaunchSuiteStepItemModel,
    });


    var LaunchMultipleSelectView = Epoxy.View.extend({
        template: 'tpl-launch-multiple-selected',

        events: {
            'click [data-ja-close]': 'onClickClose',
            'click [data-js-proceed]': 'onClickProceed',
        },

        actionValidators: {
            merge: function() {
                _.each(this.collection.models, function(model) {
                    if(model.get('launch_owner') != config.userModel.get('name')) {
                        model.set({invalidMessage: 'You are not a launch owner'});
                    } else if (model.get('status') == 'IN_PROGRESS') {
                        model.set({invalidMessage: 'Launch should not be in the status IN PROGRESS'});
                    } else if(model.get('isProcessing')) {
                        model.set({invalidMessage: 'Launch should not be processing by Auto Analysis'});
                    } else {
                        model.set({invalidMessage: ''})
                    }
                })
            },
            compare: function() {
                _.each(this.collection.models, function(model) {
                    model.set({invalidMessage: ''})
                })
            },
            movedebug: function() {
                _.each(this.collection.models, function(model) {
                    if(model.get('launch_owner') != config.userModel.get('name')) {
                        model.set({invalidMessage: 'You are not a launch owner'});
                    } else {
                        model.set({invalidMessage: ''});
                    }
                })
            },
            forcefinish: function() {
                _.each(this.collection.models, function(model) {
                    if (model.get('status') != 'IN_PROGRESS') {
                        model.set({invalidMessage: 'Launch is already finished'});
                    } else if(model.get('launch_owner') != config.userModel.get('name')) {
                        model.set({invalidMessage: 'You are not a launch owner'});
                    } else {
                        model.set({invalidMessage: ''})
                    }
                })
            },
            remove: function() {
                _.each(this.collection.models, function(model) {
                     if(model.get('launch_owner') != config.userModel.get('name')) {
                        model.set({invalidMessage: 'You are not a launch owner'});
                    } else if (model.get('status') == 'IN_PROGRESS') {
                        model.set({invalidMessage: 'Launch should not be in the status IN PROGRESS'});
                    } else {
                        model.set({invalidMessage: ''})
                    }
                })
            },
        },
        actionCall: {
            merge: function() {
                var self = this;
                this.mergeAction = new MergeAction({
                    items: this.collection.models,
                })
                this.mergeAction.getAsync().done(function() {
                    self.collectionItems.load();
                    self.mergeAction = null;
                    self.reset();
                })
            },
            compare: function() {
                var self = this;
                this.compareAction = new CompareAction({
                    items: this.collection.models,
                });
                this.compareAction.getAsync().done(function() {
                    self.compareAction = null;
                    self.reset();
                });
            },
            movedebug: function() {
                var self = this;
                MoveToDebugAction({items: this.collection.models}).done(function() {
                    self.compareAction = null;
                    self.collectionItems.load(true);
                    self.reset();
                })
            },
            forcefinish: function() {

            },
            remove: function() {
                var self = this;
                RemoveAction({items: this.collection.models}).done(function() {
                    self.compareAction = null;
                    self.collectionItems.load(true);
                    self.reset();
                })
            }
        },

        initialize: function(options) {
            this.collectionItems = options.collectionItems;
            this.collection = new SelectedItemsCollection();
            this.activate = false;
            this.render();
            this.listenTo(this.collectionItems, 'change:select', this.onChangeSelect);
            this.listenTo(this.collectionItems, 'reset', this.onResetCollectionItems);
            this.listenTo(this.collection, 'change:select', this.onUnCheckItem);
            this.listenTo(this.collection, 'add', this.onAddItem);
            this.currentAction = '';
        },
        onChangeSelect: function(model, select) {
            var cloneModel = model.clone();
            if(select) {
                !this.collection.get(model.get('id')) && this.collection.add(cloneModel);
            } else {
                this.collection.remove(model.get('id'));
            }
            this.checkStatus();
        },
        onResetCollectionItems: function() {
            var self = this;
            _.each(this.collection.models, function(model) {
                var commonModel = self.collectionItems.get(model.get('id'));
                commonModel && commonModel.set({select: true});
            })
        },
        checkStatus: function() {
            if(this.collection.models.length && !this.activate){
                this.trigger('activate:true');
                this.activate = true;
            }
            if(!this.collection.models.length && this.activate) {
                this.trigger('activate:false');
                this.activate = false;
            }
        },
        onUnCheckItem: function(model) {
            var commonModel = this.collectionItems.get(model.get('id'));
            if(commonModel) {
                commonModel.set({select: false});
            } else {
                this.collection.remove(model);
                this.checkStatus();
            }
            if(this.currentAction) {
                this.actionValidators[this.currentAction].call(this);
                this.checkInvalidStatus();
            }
        },
        checkInvalidStatus: function() {
            var answer = true;
            _.each(this.collection.models, function(model) {
                if(model.get('invalidMessage') != '') {
                    answer = false;
                    return false;
                }
            });
            if(answer) {
                this.$el.removeClass('invalid-state');
            } else {
                this.$el.addClass('invalid-state');
            }
            return answer;

        },
        setAction: function(actionName) {
            if(this.actionValidators[actionName]) {
                this.actionValidators[actionName].call(this);
                this.currentAction = actionName;
                if(this.checkInvalidStatus()) {
                    this.actionCall[actionName].call(this);
                }
            }
        },
        reset: function() {
            this.onClickClose();
        },
        onClickProceed: function() {
            var invalidItems = _.filter(this.collection.models, function(model) {
               return model.get('invalidMessage') != ''
            });
            _.each(invalidItems, function(model) {
                model.set({select: false});
            });
            this.setAction(this.currentAction);
        },
        onClickClose: function() {
            while(this.collection.models.length) {
                this.collection.at(0).set({select: false});
            }
        },
        render: function() {
            this.$el.html(Util.templates(this.template, {}));
        },
        onAddItem: function(model) {
            $('[data-js-multi-select-items]', this.$el).append((new LaunchMultipleSelectItem({model: model})).$el);
        },
        destroy: function () {
            this.$el.html('');
            this.undelegateEvents();
            this.stopListening();
            this.unbind();
            delete this;
        },
    });


    return LaunchMultipleSelectView;
});