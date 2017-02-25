'use strict';

import angular from 'angular';

import AppFooterComponent from './app-footer.component';

let appFooter = angular.module('appFooter', []);

appFooter
    .component('appFooter', new AppFooterComponent );


export default appFooter;