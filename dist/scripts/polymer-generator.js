'use strict';

class PolymerModelGenerator {
    generate(informationBase) {
        console.log('[PolymerModelGenerator] started generation process', informationBase);
        let componentModelContainer = new ComponentModelContainer();

        // Create structural dependencies and initial setup
        for (let fileEntry in informationBase) {
            for (let entry in informationBase[fileEntry].PolymerComponentNameExtractor) {
                // iterate over the component dependencies
                let componentModel = new ComponentModel(informationBase[fileEntry].PolymerComponentNameExtractor[entry]);
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