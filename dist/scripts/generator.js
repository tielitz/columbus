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
        this.structure = {};
        this.behaviour = {};
        this.content = {};
        this.style = {};
    }

    addComponentDependency(dependency) {
        if (this.structure.dependencies === undefined) {
            this.structure.dependencies = [];
        }
        this.structure.dependencies.push(dependency);
    }

    addVariable(name, type, value) {
        if (this.content.variables === undefined) {
            this.content.variables = [];
        }

        // check if variable already exists
        let entry = this.content.variables.find(el => el.name === name);

        if (entry === undefined) {
            // new variable, add to model
            this.content.variables.push({
                name: name,
                type: type,
                value: value
            });
        } else {
            // entry already exists. update parameters
            entry.type = (type !== undefined) ? type : entry.type;
            entry.value = (value !== undefined) ? value : entry.value;
        }
    }

    addFunction(name, params) {
        if (this.behaviour.functions === undefined) {
            this.behaviour.functions = [];
        }

        this.behaviour.functions.push({
            name: name,
            params: params
        });
    }

    addSingleStyle(name, value) {
        if (this.style.properties === undefined) {
            this.style.properties = [];
        }
        this.style.properties.push({
            name: name,
            value: value
        });
    }
    addMultipleStyles(styles) {
        if (this.style.properties === undefined) {
            this.style.properties = [];
        }

        let node = [];

        styles.forEach(style => {
            node.push({
                name: style.name,
                value: style.value
            });
        });

        this.style.properties.push(node);
    }

    toObject() {
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

    getComponent(component) {
        return this.models[component];
    }

    getComponentKeys() {
        return Object.keys(this.models);
    }

    toObject() {
        let obj = {};
        for (let key in this.models) {
            obj[key] = this.models[key].toObject();
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

        // Add functions
        for (let entry in informationBase.ComponentFunctionsExtractor) {
            let componentModel = componentModelContainer.getComponent(entry);
            informationBase.ComponentFunctionsExtractor[entry].forEach(a => componentModel.addFunction(a.name, a.params));
        }

        // Add variables
        // Variables can be declared in ComponentProptypesExtractor || ComponentRenderPropsExtractor
        for (let entry in informationBase.ComponentProptypesExtractor) {
            let componentModel = componentModelContainer.getComponent(entry);
            informationBase.ComponentProptypesExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
            informationBase.ComponentRenderPropsExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
            informationBase.ComponentDefaultPropsExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
        }

        // CSS Styles
        for (let entry in informationBase.ComponentRenderStyleExtractor) {
            let componentModel = componentModelContainer.getComponent(entry);
            informationBase.ComponentRenderStyleExtractor[entry].forEach(a => componentModel.addMultipleStyles(a));
        }


        console.log('[ModelGenerator] model', componentModelContainer.toObject());
        return {components: componentModelContainer.toObject()};
    }
}