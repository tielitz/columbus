'use strict';

/**
 * Abstract base class for the model generator
 * Child classes must provide an implementation for the generate method
 */
export class AbstractModelGenerator {
    /**
     * Creates a framework specific view model of the information provided in the information base
     *
     * @param  {Object} informationBase The information base generated from the information extraction
     * @return {Object}                 View models
     */
    generate(informationBase) {
        throw new Error('Method not implemented');
    }

    /**
     * Creates a dependency graph with the information provided by the FileImportExtractor
     *
     * @param  {Object} informationBase The information base generated from the information extraction
     * @return {Object}                 A list of all components and dependencies defined per file
     */
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

/**
 * Builder class for the component model
 * The model generator adds information piece by piece to construct the view model
 */
export class ComponentModel {
    constructor(name) {
        this.name = name;
        this.structure = {};
        this.behaviour = {};
        this.content = {};
        this.style = {};
    }

    /**
     * Adds additional parts to the view model
     * The parts must already be in the correct format which does not really make sense
     * The component model should be able to verify the structure or at least convert the input to the correct format
     *
     * @param {Array} parts
     */
    addParts(parts) {
        if (this.structure.parts === undefined) {
            this.structure.parts = [];
        }

        this.structure.parts.push(parts);
    }

    /**
     * Adds another property to the list if it does not exist yet. If it does, then the information is completed
     * Meaning that every information passed to the method overwrite whatever has been declared before
     *
     * @param {String} name  Name of the property
     * @param {String} type  Type of the property
     * @param {String} value Default value of the property
     */
    addVariable(name, type, value) {
        if (this.style.properties === undefined) {
            this.style.properties = [];
        }

        // check if property already exists
        let entry = this.style.properties.find(el => el.name === name);

        if (entry === undefined) {
            // new property, add to model
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

    /**
     * Adds another rule to the behaviour which has been created by the BehaviourRuleBuilder
     * Only adds events that dont exist yet. If it does, the calls are appended to the existing event
     *
     * @param {Object} rule The rule entity
     */
    addBehaviourRule(rule) {
        if (this.behaviour.rules === undefined) {
            this.behaviour.rules = [];
        }

        // check if the event already exists
        let index = this.behaviour.rules.findIndex(a =>
            // search for a rule with the same condition
            (a.condition.class == rule.condition.class) && (a.condition.partName == rule.condition.partName)
        );

        if (index >= 0) {
            // append the action to the existing rule event
            if (this.behaviour.rules[index].actions === undefined) {
                this.behaviour.rules[index].actions = [];
            }
            this.behaviour.rules[index].actions = this.behaviour.rules[index].actions.concat(rule.actions);
        } else {
            // Addnew rule
            this.behaviour.rules.push(rule);
        }
    }

    /**
     * Sort of a generate or build method
     *
     * @return {Object} The view model
     */
    toObject() {
        return {
            structure: this.structure,
            behaviour: this.behaviour,
            content: this.content,
            style: this.style,
        };
    }
}

/**
 * This class holds multiple ComponentModels under their component name
 */
export class ComponentModelContainer {
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