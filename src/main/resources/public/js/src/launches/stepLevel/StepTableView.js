/*
 * Copyright 2016 EPAM Systems
 *
 *
 * This file is part of EPAM Report Portal.
 * https://github.com/epam/ReportPortal
 *
 * Report Portal is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Report Portal is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Report Portal.  If not, see <http://www.gnu.org/licenses/>.
 */
define(function (require, exports, module) {
    'use strict';

    var $ = require('jquery');
    var Epoxy = require('backbone-epoxy');
    var Util = require('util');
    var Localization = require('localization');
    var StepItemView = require('launches/stepLevel/StepItemView');
    var LaunchSuiteStepItemsView = require('launches/common/LaunchSuiteStepItemsView');
    var SingletonUserStorage = require('storage/SingletonUserStorage');
    var App = require('app');

    var config = App.getInstance();

    var StepTableView = Epoxy.View.extend({
        template: 'tpl-launch-step-table',

        events: {
            'click .rp-grid-th[data-sorter]': 'onClickSorter',
            'click .rp-grid-th[data-filter] .rp-icons-filter': 'onClickFilter',
            'click [data-js-collapse-label]': 'clickCollapseInput',
            'change [data-js-collapse-input]': function(e) { this.onChangeCollapseInput($(e.currentTarget)); },
        },

        initialize: function(options) {
            this.filterModel = options.filterModel;
            this.render();

            this.tableItems = new LaunchSuiteStepItemsView({
                collection: options.collectionItems,
                itemView: StepItemView,
                filterModel: this.filterModel
            });
            $('[data-js-table-container]', this.$el).append(this.tableItems.$el);

            this.listenTo(this.filterModel, 'change:newSelectionParameters', this.onChangeSelectionParameters);
            this.onChangeSelectionParameters();
            this.userSettings = new SingletonUserStorage();
            var self = this;
            this.userSettings.ready.done(function(){
                self.applyPreconditionsStatus();
            });
        },
        clickCollapseInput: function(e) {
            e.stopPropagation();
        },
        onChangeCollapseInput: function($el, silent) {
            var active = $el.is(':checked');
            this.userSettings.set('statusPreconditions', active);
            var title = Localization.launches.showPreconditionMethods;
            if(active) {
                title = Localization.launches.hidePreconditionMethods;
                $('[data-js-table-container]', this.$el).addClass('hide-collapsed-methods');
            } else {
                $('[data-js-table-container]', this.$el).removeClass('hide-collapsed-methods');
            }
            if(!silent) {
                config.trackingDispatcher.preconditionMethods(active ? 'ON' : 'OFF');
            }
            $('[data-js-collapse-label]', this.$el).attr('title', title);
        },
        applyPreconditionsStatus: function(){
            var collapseInput = $('[data-js-collapse-input]', this.$el);
            collapseInput.prop('checked', this.userSettings.get('statusPreconditions'));
            this.onChangeCollapseInput(collapseInput, true);
        },
        onClickSorter: function(e) {
            var sorter = $(e.currentTarget).data('sorter');
            var filterParams = this.filterModel.getParametersObj();
            if(filterParams.sorting_column == sorter) {
                filterParams.is_asc = !filterParams.is_asc;
            } else {
                filterParams.is_asc = true;
                filterParams.sorting_column = sorter;
            }
            this.filterModel.set({newSelectionParameters: JSON.stringify(filterParams), curPage: 1});
        },
        onClickFilter: function(e) {
            e.stopPropagation();
            var filterId = $(e.currentTarget).closest('.rp-grid-th').data('filter');
            if(this.filterModel.get('id') == 'all') {
                var launchFilterCollection = new SingletonLaunchFilterCollection();
                var tempFilterModel = launchFilterCollection.generateTempModel();
                config.router.navigate(tempFilterModel.get('url'), {trigger: true});
                tempFilterModel.trigger('add_entity', filterId);
            } else {
                this.filterModel.trigger('add_entity', filterId);
            }
        },
        onChangeSelectionParameters: function() {
            $('[data-sorter]', this.$el).removeClass('sorting-asc sorting-desc');
            var filterParams = this.filterModel.getParametersObj();
            var $element = $('[data-sorter="' + filterParams.sorting_column + '"]', this.$el);
            if($element && $element.length) {
                $element.addClass((filterParams.is_asc) ? 'sorting-asc' : 'sorting-desc');
            }
        },
        render: function() {
            this.$el.html(Util.templates(this.template, {
                preconditionsStatusCls: this.statusPreconditions == 'ON' ? '' : 'hide-collapsed-methods'
            }));
        },
        destroy: function () {
            this.tableItems && this.tableItems.destroy();
            this.undelegateEvents();
            this.stopListening();
            this.unbind();
            this.$el.html('');
            delete this;
        },
    });


    return StepTableView;
});