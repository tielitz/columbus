'use strict';

import angular from 'angular';

import AppContentComponent from './app-content.component';

let appContent = angular.module('appContent', []);

appContent
    .component('appContent', new AppContentComponent );


export default appContent;