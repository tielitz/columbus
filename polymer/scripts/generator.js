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

    addParts(parts) {
        this.structure.parts = parts;
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

class ModelGenerator {
    generate(informationBase) {
        console.log('[ModelGenerator] started generation process', informationBase);
        let componentModelContainer = new ComponentModelContainer();

        // Create structural dependencies and initial setup
        for (let entry in informationBase.ComponentNameExtractor) {
            // iterate over the component dependencies
            let componentModel = new ComponentModel(informationBase.ComponentNameExtractor[entry]);
            componentModelContainer.addComponentModel(componentModel);
        }

        // Lifecycle callbacks
        for (let entry in informationBase.ComponentFunctionsExtractor) {
            let lifecycleCallbacks = ['created', 'ready', 'attached', 'detached', 'attributeChanged'];

            let componentModel = componentModelContainer.getComponent(entry);

            informationBase.ComponentFunctionsExtractor[entry].filter(a => lifecycleCallbacks.indexOf(a.name)).forEach(a => {
                let behaviourRuleBuilder = new BehaviourRuleBuilder();
                let rule = behaviourRuleBuilder
                    .setEvent(a.name, 'this')
                    .addMethod('this', a.name)
                    .create();
                componentModel.addBehaviourRule(rule);
            });
        }

        // Listeners
        for (let entry in informationBase.ComponentListenersExtractor) {
            let componentModel = componentModelContainer.getComponent(entry);

            informationBase.ComponentListenersExtractor[entry].forEach(a => {

                let behaviourRuleBuilder = new BehaviourRuleBuilder();
                let rule = behaviourRuleBuilder
                    .setEvent(a.event, a.target)
                    .addMethod('this', a.method)
                    .create();
                componentModel.addBehaviourRule(rule);
            });

        }

        // Add variables
        for (let entry in informationBase.ComponentPropertiesExtractor) {
            let componentModel = componentModelContainer.getComponent(entry);
            informationBase.ComponentPropertiesExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
        }

        console.log('[ModelGenerator] model', componentModelContainer.toObject());
        return {components: componentModelContainer.toObject()};
    }

    convertToStructurPartsModel(parts, componentModel) {
        let partEntry = {
            _entity:  parts.type === 'Identifier' ? 'reference' : 'part', // Identifier links to another component
            id: parts.id || guid()
        };

        // Add property which indicates where it should be stored
        switch (parts.type) {
            case 'HtmlExpression':
                // the HtmlExpression should remain as a part
                // maybe treat it as separate component?
                partEntry['className'] = parts.value;
                break;

            case 'Literal':
            case 'MemberExpression':
                componentModel.addSingleStyle(partEntry['id'], parts.value);
                break;

            case 'CallExpression':
                // Render is executed with componentWillMount.
                // Therefore all output functions are evaluated at the same time

                let behaviourRuleBuilder = new BehaviourRuleBuilder();
                let rule = behaviourRuleBuilder
                    .setEvent('componentWillMount', partEntry['id']) // TODO: missing any form of id
                    .addMethod(parts.value.split('.')[0], parts.value.split('.')[1], undefined)
                    .create();
                componentModel.addBehaviourRule(rule);
                break;

            default:
                // fallback to check which element is missing
                partEntry['className'] = parts.value;
        }

        console.log('[convertToStructurPartsModel]', parts.value, parts.type);

        let partChildren = [];

        if (parts.children !== undefined && parts.children.length > 0) {
            parts.children.forEach(subpart => partChildren.push(this.convertToStructurPartsModel(subpart, componentModel)));
        }

        if (partChildren.length > 0) {
            partEntry.parts = partChildren;
        }

        return partEntry;
    }
}