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
    var Backbone = require('backbone');
    var Epoxy = require('backbone-epoxy');
    var Util = require('util');
    var DefectEditorView = require('launches/stepLevel/DefectEditorView');

    var StepItemIssueView = require('launches/stepLevel/StepItemIssueView');
    var LogItemInfoStackTraceView = require('launches/logLevel/LogItemInfoStackTraceView');
    var LogItemInfoDetailsView = require('launches/logLevel/LogItemInfoDetailsView');
    var LogItemInfoActivity = require('launches/logLevel/LogItemInfoActivity');
    var LogItemInfoAttachmentsView = require('launches/logLevel/LogItemInfoAttachments');

    var LogItemInfoView = Epoxy.View.extend({
        template: 'tpl-launch-log-item-info',

        events: {
            'click [data-js-item-stack-trace-label]': function(){ this.toggleModelField('stackTrace') },
            'click [data-js-item-gallery-label]': function(){ this.toggleModelField('attachments') },
            'click [data-js-item-details-label]': function(){ this.toggleModelField('itemDetails') },
            'click [data-js-item-activity-label]': function(){ this.toggleModelField('activity') },
            'click [data-js-step-issue]': 'showDefectEditor'
        },

        bindings: {
            '[data-js-item-stack-trace-label]': 'classes: {active: stackTrace}',
            '[data-js-item-gallery-label]': 'classes: {active: attachments}',
            '[data-js-item-details-label]': 'classes: {active: itemDetails}',
            '[data-js-item-activity-label]': 'classes: {active: activity}',
            '[data-js-item-stack-trace]': 'classes: {hide: not(stackTrace)}',
            '[data-js-item-gallery]': 'classes: {hide: not(attachments)}',
            '[data-js-item-details]': 'classes: {hide: not(itemDetails)}',
            '[data-js-item-activity]': 'classes: {hide: not(activity)}',
        },

        initialize: function(options) {
            this.itemModel = options.itemModel;
            this.model = new Epoxy.Model({
                stackTrace: false,
                attachments: false,
                itemDetails: false,
                activity: false,
            });
            this.render();
            this.issueView = new StepItemIssueView({
                model: this.itemModel,
                $container: $('[data-js-step-issue]', this.$el)
            });
            this.stackTrace = new LogItemInfoStackTraceView({
                el: $('[data-js-item-stack-trace]', this.$el),
                itemModel: this.itemModel,
                parentModel: this.model,
            });
            this.details = new LogItemInfoDetailsView({
                el: $('[data-js-item-details]', this.$el),
                itemModel: this.itemModel,
                parentModel: this.model,
            });
            this.activity = new LogItemInfoActivity({
                el: $('[ data-js-item-activity]', this.$el),
                itemModel: this.itemModel,
                parentModel: this.model,
            });
            this.attachments = new LogItemInfoAttachmentsView({
                el: $('[data-js-item-gallery]', this.$el),
                itemModel: this.itemModel,
                parentModel: this.model,
            });
        },
        showDefectEditor: function(e){
            e.preventDefault();
            var el = $(e.currentTarget);
            if(!el.hasClass('disabled')){
                this.setupEditor();
                this.onShowEditor();
            }
            e.stopPropagation();
        },
        setupEditor: function () {
            this.removeEditor();
            this.$editor = new DefectEditorView({
                origin: $('[data-js-log-defect-editor]', this.$el),
                model: this.itemModel
            });
            this.listenTo(this.$editor, 'defect::editor::hide', this.onHideEditor);
        },
        onShowEditor: function(){
            $('[data-js-item-info-issue]', this.$el).hide();
        },
        onHideEditor: function(){
            $('[data-js-item-info-issue]', this.$el).show();
        },
        removeEditor: function () {
            if (this.$editor) {
                this.$editor.destroy();
                this.$editor = null;
            }
        },
        toggleModelField: function(field) {
            this.model.set(field, !this.model.get(field));
        },

        render: function() {
            this.$el.html(Util.templates(this.template), {});
        },

        destroy: function() {
            this.issueView && this.issueView.destroy();
            this.removeEditor();
            this.undelegateEvents();
            this.stopListening();
            this.unbind();
            this.$el.html('');
            delete this;
        }
    })

    return LogItemInfoView;
});