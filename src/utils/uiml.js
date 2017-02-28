'use strict';

/**
 * Builder class to construct a single rule for the behaviour part
 * Was meant to simply add events and classes without having to worry about the actual structure
 */
export class BehaviourRuleBuilder {
    constructor() {
        this.reset();
    }

    reset() {
        this.rule = {
            _entity: 'rule'
        };
    }

    /**
     * "Builds" the entities and resets itself
     *
     * @return {Object} The generated rule
     */
    create() {
        let output = this.rule;
        this.reset();
        return output;
    }

    /**
     * Defines a certain event. Thats the current status of the view model but in theory you could also have multiple
     * events that trigger 1..n calls.
     *
     * @param {string}           className Name of th event (e.g. onClick)
     * @param {string|undefined} partName  Type of the part that triggers the event. (e.g. button)
     * @param {string|undefined} uniqid    Target id of a corresponding part
     */
    setEvent(className, partName, uniqid) {
        this.rule.condition = {
            _entity:  'event',
            class:    className,
            partName: uniqid !== undefined ? uniqid : partName
        };
        return this;
    }

    /**
     * Adds another call to the list of cactions
     *
     * @param {string} componendId Component that is called. So far it is always the current component
     * @param {string} methodId    Name of the invoked method
     * @param {Array}  parameters  Array of possible parameters that are passed to the function
     */
    addMethod(componendId, methodId, parameters = []) {
        if (this.rule.actions === undefined) {
            this.rule.actions = [];
        }

        this.rule.actions.push({
            _entity: 'call',
            componentId: componendId,
            methodId: methodId,
            params: parameters.map(a => this.transformParameterEntry(a))
        });

        return this;
    }

    /**
     * Converts the parameters array to a view model complient structure.
     * @param  {Object} entry  Single object of parameters as passed from the information base
     * @return {Object}        Converted parameter entity
     */
    transformParameterEntry(entry) {

        /*
         * Different types of parameters have the information stored under different leys
         */

        if (entry.type === 'Literal') {
            return {
                _entity: 'param',
                value: entry.value
            }
        }

        if (entry.type === 'MemberExpression') {
            return {
                _entity: 'param',
                name: entry.value.split('.')[1],
                value: {
                    _entity: 'property',
                    partName: entry.value.split('.')[0]
                }
            };
        }

        /*
         * The call expression can only resolve one level
         * Theoretically this call expression can contain another set of parameters, which in turn can have another
         * call expression and this in turn ....
         */
        if (entry.type === 'CallExpression') {
            return {
                _entity: 'param',
                value: {
                    _entity: 'call',
                    componentId: entry.value.split('.')[0],
                    methodId: entry.value.split('.')[1],
                    // params: entry.parameters.map(a => this.transformParameterEntry(a))
                }
            };
        }

        if (entry.type === 'Identifier') {
            return {
                _entity: 'param',
                value: {
                    _entity: 'property',
                    partName: entry.value
                }
            };
        }

        return entry;
    }
}