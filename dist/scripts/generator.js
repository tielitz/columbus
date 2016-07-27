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


class ModelGenerator {
    generate(informationBase) {
        console.log('[ModelGenerator] started generation process', informationBase);
        let componentModel = ComponentModelUtil.getEmptyModel();

        componentModel.structure = this.createComponentStructure(informationBase);

        return {
            app: componentModel
        };
    }

    createComponentStructure(informationBase) {
        let allComponentModels = informationBase.ComponentNameExtractor.map(a => ComponentModelUtil.getComponentModel(a));
        let componentDependencies = informationBase.ComponentDependencyExtractor;
        console.log('[createComponentStructure]', allComponentModels, componentDependencies);

        let uniqueDependencyValues = ObjectUtil.getUniqueValues(componentDependencies);
        let componentStructureModel = [];

        // All components that never appear on the right side are top level components
        for (let component of allComponentModels) {
            // Check if specific component exists as a dependency
            if (uniqueDependencyValues.every(el => el !== component.name)) {
                // does not appear anywhere else
                console.log('[ModelGenerator] Top Level Component: ' + component.name);
                componentStructureModel.push(component);
            }
        }

        //

        return componentStructureModel;
    }
}