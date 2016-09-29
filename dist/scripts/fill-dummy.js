class DummyCodeGenerator {
    static generate(framework) {
        if (framework === 'React') {
            return this.generateReact();
        }

        if (framework === 'Polymer') {
            return this.generatePolymer();
        }

        if (framework === 'Angular') {
            return this.generateAngular();
        }
    }

    static generateReact() {
        return `
'use strict';

var HelloWorld = React.createClass({
  propTypes: {
    asdf: React.PropTypes.string
  },
  sayGreeting: function () {
    return 'Hello';
  },
  render: function() {
    return (
        <div>
          {this.sayGreeting()}, {this.props.asdf}!
          <HelloWorld><Child /></HelloWorld>
        </div>
      );
  }
});

var AdvancedHelloWorld = React.createClass({
  displayName: 'AdvancedHelloWorld',

  propTypes: {
    greeting: React.PropTypes.bool,
    name: React.PropTypes.string
  },
  getDefaultProps: function getDefaultProps() {
    return {
      greeting: true,
      name: 'Dummy'
    };
  },
  sayHello: function sayHello(param1, param2) {
    return 'Hello';
  },
  shouldGreet: function shouldGreet(param3) {
    return this.props.greeting;
  },

  render: function render() {
    return (
        <div style="color: #000;font-weight:bold;">
        <div id="header" onClick={this.sayHello(foo, this.foo(2), 2)}>
          <img src="" />
        </div>
        <div id="body">
          <p>{this.shouldGreet() ? this.sayHello() : ''} <i>{this.props.name}</i>!</p>
        </div>
        <HelloWorld name="Second" />
        <SecondComponent />
      </div>
    );
  }
});
    `;
    }

    static generatePolymer() {
        return `
'use strict';

Polymer({
  is: "hello-world",

  sayHello: function () {
    return 'Hello';
  },
  onSelect: function(e, detail) {
    //
  },
  created: function() {
    //
  },
  ready: function () {
    this.addEventLisener('myCustomEvent', this.sayHello);
  },
  nameChangedValue: function(newValue, oldValue) {
    console.log('Variable name changed value');
  },
  properties: {
    name: {
      type: String,
      value: "Dummy",
      observer: 'nameChangedValue'
    },
    narrow: {
      type: Boolean,
      value: false
    },
    obj: {
      type: Object,
      value: function () { return {}; }
    }
  }
});

var myElement = Polymer({
  is: 'x-app',
  extends: 'input',
  removeElement: function() {
    this.$.el.remove();
  },
  listeners: {
    'htmlid.tap': 'toggle',
    'click': 'removeElement'
  },
  toggle: function() {
    this.pressed = !this.pressed;
  },
  properties: {
    foo: {
      type: String,
    },
    pressed: {
      type: Boolean,
      value: false,
      notify: true,
      reflectToAttribute: true
    }
  }
});
    `;
    }

    static generateAngular() {
        return `
'use strict';

var app = angular.module('plunker', []);

app.component('appClass', {
  bindings: {},
  require: {
    tabsCtrl: '^myTabs'
  },
  controller: function() {
    this.$onInit = function () {
      this.name = 'Andreas';
    };
    this.foo = function (param1, param2) {
      console.log('foo');
      this.name = 'foo';
      this.oneWay = 'b';
    };
  },
  template: '<hello-world ng-if="toggle" name="{{$ctrl.name}}"></hello-world><button ng-click=$ctrl.foo()>a</button></div><br><button ng-click="toggle = !toggle">Toggle</button>'
});

app.component('helloWorld', {
  bindings: {
    name: '@',
    oneWay: '<',
    // < one-way input
    // @ immutable strings
    // & output
  },
  controller: function ($scope) {

    this.sayHello = function (){
      return 'Hello';
    };
    this.$onInit = function () {
      console.log('onInit');
    };
    this.$onInit = function () {
      console.log('onInit');
    };
    this.$onChanges = function (changesObj) {
      console.log('$onChanges', changesObj);
    };
  },
  template: '<div>{{ $ctrl.sayHello() }}, {{ $ctrl.name }}!'
  // templateUrl: 'heroDetail.html',
});

// #########

angular.module('heroApp').component('heroDetail', {
  templateUrl: 'heroDetail.html',
  controller: function () {
  var ctrl = this;

  ctrl.list = [
    {
      name: 'Superman',
      location: ''
    },
    {
      name: 'Batman',
      location: 'Wayne Manor'
    }
  ];

  ctrl.delete = function() {
    ctrl.onDelete({hero: ctrl.hero});
  };

  ctrl.update = function(prop, value) {
    ctrl.onUpdate({hero: ctrl.hero, prop: prop, value: value});
  };
},
  bindings: {
    hero: '<',
    onDelete: '&',
    onUpdate: '&'
  }
});
    `;
    }

}