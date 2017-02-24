'use strict'

import template from './app-content.template.html';

class AppContentComponent {
    constructor(){
        this.template = template;
        this.controller = AppContentController;
    }

}

class AppContentController{
    constructor() {}
}



export default AppContentComponent;