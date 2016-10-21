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


    var $ = require('jquery');
    var _ = require('underscore');
    var ModalView = require('modals/_modalView');
    var Backbone = require('backbone');
    var Service = require('coreService');
    var App = require('app');
    var Util = require('util');
    var Localization = require('localization');

    var config = App.getInstance();

    var ModalLaunchEdit = ModalView.extend({
        template: 'tpl-modal-launch-edit',
        className: 'modal-launch-edit',

        bindings: {
            '[data-js-launch-name]': 'text: name',
            '[data-js-description]': 'value: description',
            '[data-js-tags]': 'value: tagsString',
        },

        events: {
            'click [data-js-save]': 'onClickSave',
        },

        initialize: function (option) {
            this.itemModel = option.item;
            this.viewModel = new Backbone.Model({
                name: this.itemModel.get('name') + ' ' + this.itemModel.get('numberText'),
                description: this.itemModel.get('description'),
                tags: this.itemModel.getTags(),
                tagsString: this.itemModel.getTags().join(',')
            });
            this.render();
            this.applyBindings();
            Util.bootValidator($('[data-js-description]', this.$el), [{
                validator: 'minMaxNotRequired',
                type: 'launchDescription',
                min: 0,
                max: 1024
            }]);
            var self = this;
            var remoteTags = [];
            var timeOut = null;
            Util.setupSelect2WhithScroll($('[data-js-tags]', this.$el), {
                formatInputTooShort: function (input, min) {
                    return Localization.ui.enterChars;
                },
                tags: true,
                multiple: true,
                noResizeSearch: false,
                dropdownCssClass: '',
                minimumInputLength: 1,
                formatResultCssClass: function (state) {
                    if ((remoteTags.length == 0 || _.indexOf(remoteTags, state.text) < 0) && $('.select2-input.select2-active').val() == state.text) {
                        return 'exact-match';
                    }
                },
                initSelection: function (item, callback) {
                    var data = _.map(self.viewModel.get('tags'), function (tag) {
                        tag = tag.trim();
                        return {id: tag, text: tag};
                    });
                    callback(data);
                },
                createSearchChoice: function (term, data) {
                    if (_.filter(data, function (opt) {
                            return opt.text.localeCompare(term) === 0;
                        }).length === 0) {
                        return {id: term, text: term};
                    }
                },
                query: function (query) {

                    if (query.term === "?") return;

                    var data = {results: []};
                    clearTimeout(timeOut);
                    timeOut = setTimeout(function () {
                        Service.searchTags(query)
                            .done(function (response) {
                                var respType = _.isObject(response) && response.content ? 'user' : 'default',
                                    response = respType == 'default' ? response : response.content,
                                    remoteTags = [];
                                _.forEach(response, function (item) {
                                    if (respType == 'user') {
                                        data.results.push({
                                            id: item.userId,
                                            text: item.full_name
                                        });
                                        item = item.full_name;
                                    }
                                    else {
                                        data.results.push({
                                            id: item,
                                            text: item
                                        });
                                    }
                                    remoteTags.push(item);
                                });
                                query.callback(data);
                            })
                            .fail(function (error) {
                                Util.ajaxFailMessenger(error);
                            });
                    }, config.userFilterDelay);
                }

            });
            this.listenTo(this.viewModel, 'change', function(model) { console.dir(model.attributes); })
        },
        render: function () {
            this.$el.html(Util.templates(this.template, {type: this.itemModel.get('type')}));
        },
        onClickSave: function() {
            $('.form-control', this.$el).trigger('validate');
            if (!$('.has-error', this.$el).length) {
                this.itemModel.set({
                    description: this.viewModel.get('description'),
                    tags: JSON.stringify(this.viewModel.get('tagsString').split(','))
                });
                this.successClose();
            }
        }
    });

    return ModalLaunchEdit;
})