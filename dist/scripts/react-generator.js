'use strict';

class ReactModelGenerator {
    generate(informationBase) {
        console.log('[ReactModelGenerator] started generation process', informationBase);
        let componentModelContainer = new ComponentModelContainer();

        // Intial setup of all components
        for (let fileEntry in informationBase) {
            // Create structural dependencies and initial setup
            for (let entry in informationBase[fileEntry].ReactComponentDependencyExtractor) {
                // iterate over the component dependencies
                let componentModel = new ComponentModel(entry);
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
            for (let entry in informationBase[fileEntry].ReactComponentRenderBehaviourExtractor) {
                let componentModel = componentModelContainer.getComponent(entry);
                // iterates over html elements
                informationBase[fileEntry].ReactComponentRenderBehaviourExtractor[entry].forEach(entry => {

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
            // Variables can be declared in ReactComponentProptypesExtractor || ReactComponentRenderPropsExtractor
            for (let entry in informationBase[fileEntry].ReactComponentProptypesExtractor) {
                let componentModel = componentModelContainer.getComponent(entry);
                informationBase[fileEntry].ReactComponentProptypesExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
                informationBase[fileEntry].ReactComponentRenderPropsExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
                informationBase[fileEntry].ReactComponentDefaultPropsExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
            }

        }

        console.log('[ReactModelGenerator] model', componentModelContainer.toObject());
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