'use strict';

class AbstractModelGenerator {
    generate(informationBase) {
        throw new Error('Method not implemented');
    }
    createDependencyGraphModel(informationBase) {
        let model = {};

        for (let fileEntry in informationBase) {
            model[fileEntry] = {
                components: informationBase[fileEntry].components,
                dependencies: informationBase[fileEntry].FileImportExtractor
            };
        }

        return model;
    }
}

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

    addParts(parts) {
        if (this.structure.parts === undefined) {
            this.structure.parts = [];
        }

        this.structure.parts.push(parts);
    }

    addVariable(name, type, value) {
        if (this.style.properties === undefined) {
            this.style.properties = [];
        }

        // check if variable already exists
        let entry = this.style.properties.find(el => el.name === name);

        if (entry === undefined) {
            // new variable, add to model
            this.style.properties.push({
                _entity: 'property',
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

    addFunction(name, params, returnType) {
        if (this.behaviour.functions === undefined) {
            this.behaviour.functions = [];
        }

        this.behaviour.functions.push({
            _entity: 'function',
            name: name,
            params: params,
            returnType: returnType
        });
    }

    addSingleStyle(name, value) {
        if (this.style.properties === undefined) {
            this.style.properties = [];
        }
        this.style.properties.push({
            name: name,
            value: value
        });
    }
    addMultipleStyles(styles) {
        if (this.style.properties === undefined) {
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

    addBehaviourRule(rule) {
        if (this.behaviour.rules === undefined) {
            this.behaviour.rules = [];
        }
        this.behaviour.rules.push(rule);
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