'use strict';

import angular from 'angular';

import AppEditorComponent from './app-editor.component';

let appEditor = angular.module('appEditor', []);

appEditor
    .component('editor', () => new AppEditorComponent);


export default appEditor;