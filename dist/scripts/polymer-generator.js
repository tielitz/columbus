'use strict';

class PolymerModelGenerator extends AbstractModelGenerator {
    generate(informationBase) {
        console.log('[PolymerModelGenerator] started generation process', informationBase);
        let componentModelContainer = new ComponentModelContainer();

        // Create structural dependencies and initial setup
        for (let fileEntry in informationBase) {
            for (let entry in informationBase[fileEntry].components) {
                // iterate over the component dependencies
                let componentModel = new ComponentModel(informationBase[fileEntry].components[entry]);
                componentModelContainer.addComponentModel(componentModel);
            }
        }

        for (let fileEntry in informationBase) {
            // Lifecycle callbacks
            for (let entry in informationBase[fileEntry].PolymerComponentFunctionsExtractor) {
                let lifecycleCallbacks = ['created', 'ready', 'attached', 'detached', 'attributeChanged'];

                let componentModel = componentModelContainer.getComponent(entry);

                informationBase[fileEntry].PolymerComponentFunctionsExtractor[entry].filter(a => lifecycleCallbacks.indexOf(a.name)).forEach(a => {
                    let behaviourRuleBuilder = new BehaviourRuleBuilder();
                    let rule = behaviourRuleBuilder
                        .setEvent(a.name, 'this')
                        .addMethod('this', a.name)
                        .create();
                    componentModel.addBehaviourRule(rule);
                });
            }

            // Listeners
            for (let entry in informationBase[fileEntry].PolymerComponentListenersExtractor) {
                let componentModel = componentModelContainer.getComponent(entry);

                informationBase[fileEntry].PolymerComponentListenersExtractor[entry].forEach(a => {

                    let behaviourRuleBuilder = new BehaviourRuleBuilder();
                    let rule = behaviourRuleBuilder
                        .setEvent(a.event, a.target)
                        .addMethod('this', a.method)
                        .create();
                    componentModel.addBehaviourRule(rule);
                });

            }

            // Add variables
            for (let entry in informationBase[fileEntry].PolymerComponentPropertiesExtractor) {
                let componentModel = componentModelContainer.getComponent(entry);
                informationBase[fileEntry].PolymerComponentPropertiesExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
            }

        }

        console.log('[PolymerModelGenerator] model', componentModelContainer.toObject());
        return {components: componentModelContainer.toObject()};
    }
}