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
'use strict';

define(function(require, exports, module) {
    var $ = require('jquery');
    var Backbone = require('backbone');
    var Util = require('util');
    var App = require('app');
    var Service = require('coreService');
    var Storage = require('storageService');
    var SingletonURLParamsModel = require('model/SingletonURLParamsModel');
    require('cookie');
    require('base64');

    var config = App.getInstance();
    var instance = null;
    var getInstance = function(){
        if(!instance) instance = new UserModel;
        return instance
    };
    var UserModel = Backbone.Model.extend({

        defaults: {
            auth: false,
            user_login: null,
            access_token: null,
            redirectUrl: null,
            projects: null,
            defaultProject: null,
            roles: null,
            label: null,
            name: 'anonymous',
            email: null,
            account_type: null,
            userRole: null,
            image: null,
            photo_loaded: false,
            lastInsideHash: null,
            token: 'Basic dWk6dWltYW4=',
        },

        initialize: function () {
            this.ready = $.Deferred();
            this.listenTo(this, 'change:lastInsideHash', this.onChangeLastInsideHash);
            this.set({'token': this.getToken()});
            this.listenTo(this, 'change:token', this.onChangeToken);

            // this.loadSession();
            // this.isLogin = false;

        },
        checkAuthUrl: function() {
            var urlModel = new SingletonURLParamsModel();
            if(urlModel.get('access_token') && urlModel.get('token_type')) {
                this.set({token: urlModel.get('token_type') + ' ' + urlModel.get('access_token')});
                this.loginSuccess();
            }
        },

        isAuth: function(){
            var self = this;
            var async = $.Deferred();

            this.ready.done(function(){
                if(self.get('auth')){
                    async.resolve();
                }else{
                    async.reject();
                }
            });

            return async.promise();
        },
        onChangeToken: function(model, token) {
            if(window.localStorage && token) {
                window.localStorage.setItem('session_token', token);
            }
        },
        getToken: function() {
            if(!window.localStorage) {
                return this.defaults.token;
            }
            return window.localStorage.getItem('session_token');
        },

        onChangeLastInsideHash: function(model, lastInsideHash){
            if(window.localStorage && lastInsideHash) {
                window.localStorage.setItem(this.get('name') + '_lastInsideHash', lastInsideHash);
            }
        },
        clearLastInsidePage: function(){
            this.set({lastInsideHash: null});
            if(window.localStorage) window.localStorage.removeItem(this.get('name') + '_lastInsideHash');
        },
        getLastInsideHashStorage: function(){
            if(!window.localStorage) return false;
            var hash = window.localStorage.getItem(this.get('name') + '_lastInsideHash');
            if(hash == 'null') return false;
            return hash;
        },
        getAnonymousHash: function() {
            if(!window.localStorage) return false;
            var hash = window.localStorage.getItem('anonymous_lastInsideHash');
            window.localStorage.removeItem('anonymous_lastInsideHash');
            if(hash == 'null') return false;
            return hash;
        },
        load: function(){
            var self = this;

            this.updateInfo()
                .done(function(){
                    self.updateProjects()
                        .done(function(){
                            self.set({
                                'lastInsideHash': self.getAnonymousHash() || self.getLastInsideHashStorage() ||
                                self.getDefaultProjectHash()
                            });
                            self.set({auth: true});

                            self.ready.resolve();
                        })
                        .fail(function(){
                            self.set(self.defaults);
                            self.ready.resolve();
                        })
                })
                .fail(function(){
                    self.set(self.defaults);
                    setTimeout(function() { self.ready.resolve(); });
                });
        },
        parse: function(response){
            return {
                defaultProject: response.default_project,
                label: response.uuid,
                name: response.userId,
                fullName: response.full_name,
                email: response.email,
                account_type: response.account_type,
                userRole: response.userRole,
                photo_loaded: response.photo_loaded,
                image: config.apiVersion + 'data/photo?' + response.userId + '?at=' + Date.now(),
            //
                user_login: response.userId
            }
        },
        updateInfo: function(){
            var self = this;

            return Service.getCurrentUser()
                .done(function(response){
                    self.set(self.parse(response));
                })

        },
        updateProjects: function(){
            var async = $.Deferred();
            var self = this;

            if(!this.get('name')) {
                async.reject();
                return async.promise();
            }
            Service.getUserAssignedProjects(this.get('name'))
                .done(function(projects){
                    self.set({'projects': projects});
                    async.resolve(projects);
                })
                .fail(function(){
                    async.reject();
                });

            return async.promise();
        },
        getDefaultProjectHash: function () {
            return '#' + this.get('defaultProject');
        },

        clearSession: function () {
            this.set(this.defaults);
        },

        updateDefaultProject: function (project, callback) {
            var self = this;
            config.project = {projectId: project};
            Service.updateDefaultProject(project)
                .done(function () {
                    self.set('defaultProject', project);
                    if (callback && _.isFunction(callback)) {
                        callback();
                    }
                })
                .fail(function (error) {
                    Util.ajaxFailMessenger(error, 'updateDefaultProject');
                });
        },

        // makeBaseAuth: function (login, pass) {
        //     var tok = login + ':' + pass;
        //     var hash = Base64.encode(tok);
        //     return "Basic " + hash;
        // },
        login: function (login, pass) {
            login = login.toLowerCase();
            var self = this;
            this.trigger('login::loader::show');
            return Service.userLogin({
                login: login,
                password: pass,
            })
                .done(function (responce) {
                    self.set({token: responce.token_type + ' ' + responce.access_token});
                    self.loginSuccess();
                })
                .fail(function (response) {
                    self.clearSession();
                });
        },
        // don't touch
        loginSuccess: function(){
            this.set('redirectUrl', null);
            Util.ajaxSuccessMessenger('signedIn');
            this.load();
        },


        clearLocalSession: function () {

        },

        hasPermissions: function (incomingProjectRole) {

            var project = this.get('projects')[config.project.projectId];

            if (Util.isAdmin(config.userModel.toJSON())) {
                return true;
            }

            if (!project) {
                return false;
            }

            var projectRole = project.projectRole;
            incomingProjectRole = incomingProjectRole || projectRole;

            var projectRoleIndex = _.indexOf(config.projectRoles, projectRole),
                incomingProjectRoleIndex = _.indexOf(config.projectRoles, incomingProjectRole),
                permission = false;
            if (projectRoleIndex > 1) {
                permission = projectRoleIndex >= incomingProjectRoleIndex;
            }
            return permission;
        },


        logout: function () {
            Service.userLogout();
            config.trackingDispatcher.userLoggedOut(Storage.getCurrentLogin());
            Util.clearXhrPool();
            config.project = {};
            this.clearSession();
        }
    });

    return getInstance;
});