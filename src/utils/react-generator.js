'use strict';

import {AbstractModelGenerator,ComponentModel,ComponentModelContainer} from './shared-generator';
import guid from './guid';
import {BehaviourRuleBuilder} from './uiml';


export class ReactModelGenerator extends AbstractModelGenerator {
    generate(informationBase) {
        console.log('[ReactModelGenerator] started generation process', informationBase);
        let componentModelContainer = new ComponentModelContainer();

        // Intial setup of all components
        for (let fileEntry in informationBase) {
            // Create structural dependencies and initial setup
            for (let entry in informationBase[fileEntry].ReactComponentDependencyExtractor) {
                // iterate over the component dependencies
                let componentModel = new ComponentModel(entry);
                this.addDefaultLifeCycleBehaviourRules(componentModel);
                componentModelContainer.addComponentModel(componentModel);
            }
        }

        // generation process
        for (let fileEntry in informationBase) {
            // Add parts
            for (let entry in informationBase[fileEntry].ReactComponentRenderHtmlExtractor) {
                let componentModel = componentModelContainer.getComponent(entry);
                componentModel.addParts(this.convertToStructurPartsModel(
                    informationBase[fileEntry].ReactComponentRenderHtmlExtractor[entry],
                    componentModel
                ));
            }

            // Behaviour rules
            for (let entry in informationBase[fileEntry].ReactComponentLifeCycleExtractor) {
                let componentModel = componentModelContainer.getComponent(entry);
                // iterates over html elements
                informationBase[fileEntry].ReactComponentLifeCycleExtractor[entry].forEach(entry => {

                        let behaviourRuleBuilder = new BehaviourRuleBuilder();
                        let rule = behaviourRuleBuilder
                            .setEvent(entry.name) // TODO: missing any form of id
                            .addMethod(undefined, entry.name, entry.params)
                            .create();
                        componentModel.addBehaviourRule(rule);
                });
            }

            // custom rules inside render
            for (let entry in informationBase[fileEntry].ReactComponentRenderBehaviourExtractor) {
                let componentModel = componentModelContainer.getComponent(entry);
                // iterates over html elements
                informationBase[fileEntry].ReactComponentRenderBehaviourExtractor[entry].forEach(entry => {

                    // each element can contain multiple events
                    entry.properties.forEach(event => {

                        let method = this.splitMethodName(event.action);

                        let behaviourRuleBuilder = new BehaviourRuleBuilder();
                        let rule = behaviourRuleBuilder
                            .setEvent(event.event, entry.element, entry.uniqid)
                            .addMethod(
                                method.componentId,
                                method.methodId, // splits the action on the last .
                                event.params)
                            .create();
                        componentModel.addBehaviourRule(rule);
                    });
                });
            }

            // Add variables
            // Variables can be declared in ReactComponentProptypesExtractor || ReactComponentRenderPropsExtractor
            for (let entry in informationBase[fileEntry].ReactComponentProptypesExtractor) {
                let componentModel = componentModelContainer.getComponent(entry);
                if (informationBase[fileEntry].ReactComponentProptypesExtractor[entry]) {
                    informationBase[fileEntry].ReactComponentProptypesExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
                }
                if (informationBase[fileEntry].ReactComponentRenderPropsExtractor[entry]) {
                    informationBase[fileEntry].ReactComponentRenderPropsExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
                }
                if (informationBase[fileEntry].ReactComponentDefaultPropsExtractor[entry]) {
                    informationBase[fileEntry].ReactComponentDefaultPropsExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
                }
                if (informationBase[fileEntry].ReactComponentInitialStateExtractor[entry]) {
                    informationBase[fileEntry].ReactComponentInitialStateExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
                }
            }

        }

        console.log('[ReactModelGenerator] model', componentModelContainer.toObject());
        return {components: componentModelContainer.toObject()};
    }

    addDefaultLifeCycleBehaviourRules(entry) {
        const events = ['componentWillMount','componentDidMount','componentWillReceiveProps','shouldComponentUpdate',
            'componentWillUpdate','componentDidUpdate','componentWillUnmount'];

        for (let i = 0; i < events.length; i++) {
            let behaviourRuleBuilder = new BehaviourRuleBuilder();
            let rule = behaviourRuleBuilder.setEvent(events[i]).create();
            entry.addBehaviourRule(rule);
        }
    }

    splitMethodName(elementName) {
        // strip () at the end of the element nmae
        if (elementName.indexOf('()') !== -1) {
            elementName = elementName.substring(0, elementName.length-2);
        }
        let parts = elementName.split('.');

        if (parts[parts.length-1] === 'bind') {
            // in case the last element is bind, skip it
            parts.splice(parts.length-1, 1); // remove last element
        }

        return {
            componentId: parts.slice(0, parts.length-1).join('.'),
            methodId:    parts[parts.length-1]
        }
    }

    convertToStructurPartsModel(parts, componentModel) {
        if (parts === null) {
            return;
        }
        let partEntry = {
            _entity:  parts.type === 'Identifier' ? 'reference' : 'part', // Identifier links to another component
            id: parts.uniqid || parts.id || guid()
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
                componentModel.addVariable(partEntry['id'], undefined, parts.value);
                break;

            case 'CallExpression':
                // Render is executed with componentWillMount.
                // Therefore all output functions are evaluated at the same time

                let behaviourRuleBuilder = new BehaviourRuleBuilder();
                let rule = behaviourRuleBuilder
                    .setEvent('componentWillMount', partEntry['id']) // TODO: missing any form of id
                    .addMethod(parts.value.split('.')[0], parts.value.split('.')[1], parts.params)
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