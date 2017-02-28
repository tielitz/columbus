'use strict';

import {AbstractModelGenerator,ComponentModel,ComponentModelContainer} from './shared-generator';
import {BehaviourRuleBuilder} from './uiml';

export class AngularModelGenerator extends AbstractModelGenerator {
    generate(informationBase) {
        console.log('[AngularModelGenerator] started generation process', informationBase);
        let componentModelContainer = new ComponentModelContainer();

        // Create structural dependencies and initial setup
        for (let fileEntry in informationBase) {
            for (let entry in informationBase[fileEntry].components) {
                // iterate over the component dependencies
                let componentModel = new ComponentModel(informationBase[fileEntry].components[entry]);
                this.addDefaultLifeCycleBehaviourRules(componentModel);
                componentModelContainer.addComponentModel(componentModel);
            }
        }

        for (let fileEntry in informationBase) {


            // Lifecycle callbacks
            for (let entry in informationBase[fileEntry].AngularComponentFunctionsExtractor) {
                let lifecycleCallbacks = ['$onInit','$onChanges','$doCheck','$onDestroy','$postLink'];

                let componentModel = componentModelContainer.getComponent(entry);

                informationBase[fileEntry].AngularComponentFunctionsExtractor[entry].filter(a => lifecycleCallbacks.indexOf(a.name) >= 0).forEach(a => {
                    let behaviourRuleBuilder = new BehaviourRuleBuilder();
                    let rule = behaviourRuleBuilder
                        .setEvent(a.name, 'this')
                        .addMethod('this', a.name)
                        .create();
                    componentModel.addBehaviourRule(rule);
                });
            }

            // Add variables
            for (let entry in informationBase[fileEntry].AngularComponentPropertiesExtractor) {
                let componentModel = componentModelContainer.getComponent(entry);
                informationBase[fileEntry].AngularComponentPropertiesExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
            }
            for (let entry in informationBase[fileEntry].AngularComponentBindingsExtractor) {
                let componentModel = componentModelContainer.getComponent(entry);
                if (informationBase[fileEntry].AngularComponentBindingsExtractor[entry]) {
                    informationBase[fileEntry].AngularComponentBindingsExtractor[entry].forEach(a =>
                        componentModel.addVariable(a.name));
                }
            }

            // Structure dependencies
            for (let entry in informationBase[fileEntry].AngularComponentDependencyExtractor) {
                let componentModel = componentModelContainer.getComponent(entry);

                if (informationBase[fileEntry].AngularComponentDependencyExtractor[entry]) {
                    // we have dependencies
                    informationBase[fileEntry].AngularComponentDependencyExtractor[entry].forEach(a => {
                        // this component depends on a.target component
                        let dependency = {
                            _entity: 'reference',
                            id: a.target.replace('^', '')
                        };
                        componentModel.addParts(dependency);
                    });
                }
            }

        }

        console.log('[AngularModelGenerator] model', componentModelContainer.toObject());
        return {components: componentModelContainer.toObject()};
    }

    addDefaultLifeCycleBehaviourRules(entry) {
        const events = ['$onInit','$onChanges','$doCheck','$onDestroy','$postLink'];

        for (let i = 0; i < events.length; i++) {
            let behaviourRuleBuilder = new BehaviourRuleBuilder();
            let rule = behaviourRuleBuilder.setEvent(events[i]).create();
            entry.addBehaviourRule(rule);
        }
    }
}