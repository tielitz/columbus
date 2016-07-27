'use strict';

class ComponentModelUtil {
    static getEmptyModel() {
        return {
            structure: [],
            content: [],
            behaviour: [],
            style: [],
        };
    }

    static getComponentModel(component) {
        let model = this.getEmptyModel();
        model.name = component;
        return model;
    }
}

class ObjectUtil {
    static getValues(obj) {
        let val = [];
        for (let prop in obj) {
            if (obj[prop] instanceof Array) { // need to test Array first because an Array is also an Object
                val = val.concat(obj[prop]);
            } else if (obj[prop] instanceof Object) {
                val.push(this.getValues(obj[prop]));
            } else {
                val.push(obj[prop]);
            }
        }
        return val;
    }

    static getUniqueValues(obj) {
        let vals = ObjectUtil.getValues(obj);
        return vals.filter((el, index, self) => self.indexOf(el) === index);
    }
}

class ComponentModel {
    constructor(name) {
        this.name = name;
        this.structure = [];
        this.behaviour = [];
        this.content = [];
        this.style = {properties: []};
    }

    addComponentDependency(dependency) {
        this.structure.push(dependency);
    }

    addVariable(name, type, value) {
        // TODO
    }

    toString() {
        return {
            structure: this.structure,
            behaviour: this.behaviour,
            content: this.content,
            style: this.style,
        };
    }
}

class ComponentModelContainer {
    constructor() {
        this.models = {};
    }

    addComponentModel(model) {
        this.models[model.name] = model;
    }

    toObject() {
        let obj = {};
        for (let key in this.models) {
            obj[key] = this.models[key].toString();
        }
        return obj;
    }
}

class ModelGenerator {
    generate(informationBase) {
        console.log('[ModelGenerator] started generation process', informationBase);
        let componentModelContainer = new ComponentModelContainer();

        // Create structural dependencies and initial setup
        for (let entry in informationBase.ComponentDependencyExtractor) {
            // iterate over the component dependencies
            let componentModel = new ComponentModel(entry);
            informationBase.ComponentDependencyExtractor[entry].forEach(a => componentModel.addComponentDependency(a));
            componentModelContainer.addComponentModel(componentModel);
        }


        console.log('[ModelGenerator] model', componentModelContainer.toObject());
        return {components: componentModelContainer.toObject()};
    }
}