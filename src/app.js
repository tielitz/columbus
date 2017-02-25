'use strict';

import angular from 'angular';

import angularMaterial from 'angular-material';
import 'angular-material/angular-material.css';

import ngMdIcons from 'angular-material-icons';


import appHeader from './components/app-header/app-header';
import appContent from './components/app-content/app-content';
import appFooter from './components/app-footer/app-footer';


var appModule = angular.module('app', [
    angularMaterial,
    ngMdIcons,
    appHeader.name,
    appContent.name,
    appFooter.name
]);


angular.element(document).ready(function() {
    return angular.bootstrap(document.body, [appModule.name], {
        strictDi: true
    });
});

export default appModule;