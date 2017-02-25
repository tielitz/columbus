'use strict';

import angular from 'angular';

import AppEditor from './../app-editor/app-editor';
import GithubReader from './../github-reader/github-reader';
import AppContentComponent from './app-content.component';


let appContent = angular.module('appContent', [AppEditor.name, GithubReader.name]);

appContent
    .component('appContent', new AppContentComponent );


export default appContent;