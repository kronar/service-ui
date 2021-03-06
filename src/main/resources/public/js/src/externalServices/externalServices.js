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
    var Util = require('util');
    var App = require('app');
    var SingletonAppModel = require('model/SingletonAppModel');

    var config = App.getInstance();
    var appModel = new SingletonAppModel();

    var loadExternal = function(){
        var async = $.Deferred();
        var script = document.createElement('script');

        script.type = 'text/javascript';
        script.async = true;
        script.src = '/epam/externalServices.js';
        script.onload = function(){
            if(!window.ExternalServices){
                async.resolve();

                return;
            }
            new window.ExternalServices({Backbone: Backbone, Util: Util, config: config, AppModel: appModel});
            async.resolve();
        };
        script.onerror = function() {

            async.resolve();
        };

        var lastScript = document.getElementsByTagName('script')[0];
        lastScript.parentNode.insertBefore(script, lastScript)

        return async;
    }

    return loadExternal;
});