'use strict';

import angular from 'angular';

import AppHeaderComponent from './app-header.component';

let appHeader = angular.module('appHeader', []);

appHeader
    .component('appHeader', new AppHeaderComponent );


export default appHeader;