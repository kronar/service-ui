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
    var Util = require('util');
    var Components = require('core/components');
    var Helpers = require('helpers');
    var Service = require('coreService');
    var Storage = require('storageService');
    var Markitup = require('markitup');
    var MarkitupSettings = require('markitupset');

    var config = App.getInstance();

    // TODO -rewrite for Modal object

    var LoadBug = Components.DialogShell.extend({

        initialize: function (options) {

            options['headerTxt'] = 'loadBug';
            options['actionTxt'] = 'add';
            options['actionStatus'] = true;
            Components.DialogShell.prototype.initialize.call(this, options);

            this.items = options.items;
            this.systems = _.sortBy(config.project.configuration.externalSystem, 'project');
            this.systemId = config.session.lastLoadedTo || this.systems[0].id;
            this.type = Util.getExternalSystem();
        },

        contentBody: 'tpl-load-bug',
        rowTpl: 'tpl-load-bug-row',

        render: function () {
            Components.DialogShell.prototype.render.call(this, {isBeta: true});
            var current = _.find(this.systems, {id: this.systemId});
            this.$content.html(Util.templates(this.contentBody, {
                systems: this.systems,
                current: current || this.systems[0]
            }));
            this.$rowsHolder = $("#rowHolder", this.$content);
            this.$postToUrl = $("#postToUrl", this.$el);
            this.renderRow();
            this.delegateEvents();
            return this;
        },
        renderRow: function () {
            this.$rowsHolder.append(Util.templates(this.rowTpl));
            Util.bootValidator($(".issue-row:last .issue-id", this.$rowsHolder), {
                validator: 'minMaxRequired',
                type: 'issueId',
                min: 1,
                max: 128
            });
            Util.bootValidator($(".issue-row:last .issue-link", this.$rowsHolder), [
                {
                    validator: 'matchRegex',
                    type: 'issueLinkRegex',
                    pattern: config.patterns.urlT,
                    arg: 'i'
                }
            ]);
        },
        addRow: function () {
            this.renderRow();
            this.$rowsHolder.addClass('multi');
        },
        removeRow: function (e) {
            $(e.currentTarget).closest('.issue-row').remove();
            if ($(".issue-row", this.$rowsHolder).length === 1) this.$rowsHolder.removeClass('multi');
        },
        events: function () {
            return _.extend({}, Components.DialogShell.prototype.events, {
                'click .project-name': 'updateProject',
                'click #addRow': 'addRow',
                'click .remove-row': 'removeRow',
                'blur .issue-link': 'autoFillId'
            });
        },
        autoFillId: function (e) {
            if (this.canAutoFill()) {
                var $link = $(e.currentTarget),
                    $id = $link.closest('.issue-row').find('.issue-id'),
                    link = $link.val(),
                    autoValue;
                if (!link || !$link.data('valid') || $.trim($id.val())) return;
                if (this.isJiraBts()) {
                    autoValue = link.split('/');
                    autoValue = autoValue[autoValue.length - 1];
                }
                if (this.isTfsBts()) {
                    autoValue = link.split('id=')[1];
                    autoValue = autoValue ? autoValue.split('&')[0] : '';
                }
                $id.val(autoValue).trigger('validate');
            }
        },
        canAutoFill: function () {
            return this.type && (this.isJiraBts() || this.isTfsBts());
        },
        isJiraBts: function () {
            return this.type === config.btsEnum.jira;
        },
        isTfsBts: function () {
            return this.type === config.btsEnum.tfs;
        },
        updateProject: function (e) {
            Util.dropDownHandler(e);
            this.systemId = $(e.currentTarget).attr('id');
            var system = _.find(this.systems, {id: this.systemId});
            this.$postToUrl.text(system.url);
        },

        updateIssues: function (items, response) {
            var issues = [];
            _.forEach(items, function (item, i) {
                var defectBadge = $('.inline-editor .rp-defect-type-dropdown .pr-defect-type-badge'),
                    chosenIssue = defectBadge.length > 0 ? defectBadge.data('id') : null,
                    issue = {
                        issue_type: chosenIssue ? chosenIssue : item.issue.issue_type,
                        comment: item.issue.comment,
                        externalSystemIssues: item.issue.externalSystemIssues || []
                    };

                if ($('#replaceComments').prop('checked')) {
                    issue.comment = $('.markItUpEditor').val().length > 0 ? $('.markItUpEditor').val() : this.items[i].issue.comment;
                }

                if (item.id == $('.editor-row').closest('.selected').attr('id')) {
                    issue.comment = $('.markItUpEditor').val();
                }
                _.each(response.issues, function(is){
                    issue.externalSystemIssues.push({
                        ticketId: is.ticketId,
                        systemId: response.systemId,
                        url: is.url
                    });
                });
                issues.push({issue: issue, test_item_id: item.id});
            }, this);
            return issues;
        },

        submit: function () {
            $('.form-control', this.$rowsHolder).trigger('validate');
            if (!$('.has-error', this.$rowsHolder).length) {
                var data = {},
                    self = this;
                data.systemId = this.systemId;
                data.testItemIds = _.map(this.items, 'id');
                data.issues = _.map($('.issue-row', this.$rowsHolder), function (row) {
                    var id = $(row).find('.issue-id').val(),
                        url = $(row).find('.issue-link').val();
                    return {
                        ticketId: id,
                        url: url
                    }
                });
                this.inSubmit = true;
                Service.loadBugs(data)
                    .done(function (response) {
                        var issues = self.updateIssues(self.items, data);
                        Service.updateDefect({issues: issues})
                            .done(function () {
                                Util.ajaxSuccessMessenger("submitKeys");
                                self.trigger("bug::loaded");
                            })
                            .fail(function (error) {
                                errorHandler(error);
                            })
                            .always(function () {
                                self.done();
                            });
                        config.session.lastLoadedTo = self.systemId;
                        config.trackingDispatcher.jiraTicketLoad(data.issues.length);
                    })
                    .fail(function (error) {
                        Util.ajaxFailMessenger(error, "submitKeys");
                    })
                    .always(function () {
                        self.inSubmit = false;
                    });
            }
        }
    });

    return LoadBug;
})