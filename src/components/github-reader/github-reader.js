'use strict';

import angular from 'angular';

import GithubReaderService from './github-reader.service';

let githubReader = angular.module('githubReader', []);

githubReader
    .service('githubReaderService', GithubReaderService);


export default githubReader;