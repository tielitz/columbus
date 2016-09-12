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
        for (let entry in informationBase.ComponentDependencyExtractor) {
            // iterate over the component dependencies
            let componentModel = new ComponentModel(entry);
            // informationBase.ComponentDependencyExtractor[entry].forEach(a => componentModel.addComponentDependency(a));
            componentModelContainer.addComponentModel(componentModel);
        }

        // Add parts
        for (let entry in informationBase.ComponentRenderHtmlExtractor) {
            let componentModel = componentModelContainer.getComponent(entry);
            componentModel.addParts(this.convertToStructurPartsModel(
                informationBase.ComponentRenderHtmlExtractor[entry],
                componentModel
            ));
        }

        // Add functions
        // for (let entry in informationBase.ComponentFunctionsExtractor) {
        //     let componentModel = componentModelContainer.getComponent(entry);
        //     informationBase.ComponentFunctionsExtractor[entry].forEach(func => {

        //         if (informationBase.ComponentFunctionReturnValueExtractor[entry][func.name] !== undefined) {
        //             // the information base contains information about the return value
        //             componentModel.addFunction(func.name, func.params, informationBase.ComponentFunctionReturnValueExtractor[entry][func.name])
        //         } else {
        //             componentModel.addFunction(func.name, func.params)
        //         }
        //     });
        // }

        // Behaviour rules
        for (let entry in informationBase.ComponentRenderBehaviourExtractor) {
            let componentModel = componentModelContainer.getComponent(entry);
            // iterates over html elements
            informationBase.ComponentRenderBehaviourExtractor[entry].forEach(entry => {

                // each element can contain multiple events
                entry.properties.forEach(event => {
                    let behaviourRuleBuilder = new BehaviourRuleBuilder();
                    let rule = behaviourRuleBuilder
                        .setEvent(event.event, entry.element) // TODO: missing any form of id
                        .addMethod(event.action.split('.')[0], event.action.split('.')[1], event.params)
                        .create();
                    componentModel.addBehaviourRule(rule);
                });
            });
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
        // for (let entry in informationBase.ComponentRenderStyleExtractor) {
        //     let componentModel = componentModelContainer.getComponent(entry);
        //     informationBase.ComponentRenderStyleExtractor[entry].forEach(a => componentModel.addMultipleStyles(a));
        // }


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