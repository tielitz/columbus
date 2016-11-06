'use strict';

class AngularModelGenerator extends AbstractModelGenerator {
    fillFrameworkSpecificPart(componentModelContainer) {

        for (let fileEntry in informationBase) {

            // Lifecycle callbacks
            for (let entry in informationBase[fileEntry].AngularComponentFunctionsExtractor) {
                let lifecycleCallbacks = ['created', 'ready', 'attached', 'detached', 'attributeChanged'];

                let componentModel = componentModelContainer.getComponent(entry);

                informationBase[fileEntry].AngularComponentFunctionsExtractor[entry].filter(a => lifecycleCallbacks.indexOf(a.name)).forEach(a => {
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

        } // for

    }
}