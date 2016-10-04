'use strict';

class AngularModelGenerator {
    generate(informationBase) {
        console.log('[AngularModelGenerator] started generation process', informationBase);
        let componentModelContainer = new ComponentModelContainer();

        // Create structural dependencies and initial setup
        for (let entry in informationBase.AngularComponentNameExtractor) {
            // iterate over the component dependencies
            let componentModel = new ComponentModel(informationBase.AngularComponentNameExtractor[entry]);
            componentModelContainer.addComponentModel(componentModel);
        }

        // Lifecycle callbacks
        for (let entry in informationBase.AngularComponentFunctionsExtractor) {
            let lifecycleCallbacks = ['created', 'ready', 'attached', 'detached', 'attributeChanged'];

            let componentModel = componentModelContainer.getComponent(entry);

            informationBase.AngularComponentFunctionsExtractor[entry].filter(a => lifecycleCallbacks.indexOf(a.name)).forEach(a => {
                let behaviourRuleBuilder = new BehaviourRuleBuilder();
                let rule = behaviourRuleBuilder
                    .setEvent(a.name, 'this')
                    .addMethod('this', a.name)
                    .create();
                componentModel.addBehaviourRule(rule);
            });
        }

        // Add variables
        for (let entry in informationBase.AngularComponentPropertiesExtractor) {
            let componentModel = componentModelContainer.getComponent(entry);
            informationBase.AngularComponentPropertiesExtractor[entry].forEach(a => componentModel.addVariable(a.name, a.type, a.value));
        }

        // Structure dependencies
        for (let entry in informationBase.AngularComponentDependencyExtractor) {
            let componentModel = componentModelContainer.getComponent(entry);

            if (informationBase.AngularComponentDependencyExtractor[entry]) {
                // we have dependencies
                informationBase.AngularComponentDependencyExtractor[entry].forEach(a => {
                    // this component depends on a.target component
                    let dependency = {
                        _entity: 'reference',
                        id: a.target.replace('^', '')
                    };
                    componentModel.addParts(dependency);
                });
            }
        }

        console.log('[AngularModelGenerator] model', componentModelContainer.toObject());
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