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

    var Backbone = require('backbone');
    var Storage = Backbone.Model.extend({
        storage: window.localStorage,
        getItem: function(itemName) {
            if(!this.storage) {
                return false;
            }
            return this.storage.getItem(itemName);
        },
        setItem: function(itemName, data) {
            if(!this.storage) {
                return false;
            }
            this.storage.setItem(itemName, data);
        }
    });

    return Storage;
});
