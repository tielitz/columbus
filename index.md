---
# You don't need to edit this file, it's empty on purpose.
# Edit theme's home layout instead if you wanna make some changes
# See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: page
title: Columbus
---


Columbus is a web-based JavaScript application which implements a view model extraction process for JavaScript frontend frameworks. It fetches the contents of a GitHub repository and shows the files and generated output from the applied extraction process. The information generated from each extraction step is displayed alongside the view model.

## User Interface



![Columbus UI](/columbus/assets/columbus1.jpg)
![Columbus UI](/columbus/assets/columbus2.jpg)

## Created Output
The output of Columbus is a JSON representation of the view model. That model can (manually) be translated into a corresponding object diagram.
![Columbus Output](/columbus/assets/columbus-output1.jpg)

Actual output:
```json
{
  "LoginForm":{
    "structure":{
      "parts":[
        {
          "_entity":"reference",
          "id":"fadaa52c-6c6d-91e5-e4b6-fcbc27546f52",
          "className":"Formsy",
          "parts":[
            {
              "_entity":"part",
              "id":"404c15af-dcb1-802e-195f-362318a89f3a",
              "className":"h3",
              "parts":[
                {
                  "_entity":"part",
                  "id":"26c7813a-aeda-20a0-cf2b-dd258e289e33"
                }
              ]
            },
            {
              "_entity":"reference",
              "id":"6945e8f8-b06b-41b1-6a9a-c54c0dfc03fc",
              "className":"FRC"
            },
            {
              "_entity":"reference",
              "id":"dbb3571c-0a78-a8f3-c7aa-b8128668d20c",
              "className":"FRC"
            },
            {
              "_entity":"part",
              "id":"2b7ee91d-59d2-fb2f-bb7a-86c578d927ed",
              "className":"button",
              "parts":[
                {
                  "_entity":"part",
                  "id":"cef42063-58bf-65f1-834a-e4f9a42dbd8f"
                }
              ]
            },
            {
              "_entity":"reference",
              "id":"e967489f-1843-0bd5-c1c9-38a8dbb6e36e",
              "className":"Link",
              "parts":[
                {
                  "_entity":"part",
                  "id":"16af6fd5-41a3-0fb4-8224-b32212e1105f"
                }
              ]
            }
          ]
        }
      ]
    },
    "behaviour":{
      "rules":[
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"componentWillMount"
          }
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"componentDidMount"
          }
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"componentWillReceiveProps"
          }
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"shouldComponentUpdate"
          }
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"componentWillUpdate"
          }
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"componentDidUpdate"
          }
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"componentWillUnmount"
          }
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"componentWillMount",
            "partName":"26c7813a-aeda-20a0-cf2b-dd258e289e33"
          },
          "actions":[
            {
              "_entity":"call",
              "componentId":"this",
              "methodId":"getIntlMessage()",
              "params":[
                {
                  "_entity":"param",
                  "value":"shared.header.log-in"
                }
              ]
            }
          ]
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"componentWillMount",
            "partName":"cef42063-58bf-65f1-834a-e4f9a42dbd8f"
          },
          "actions":[
            {
              "_entity":"call",
              "componentId":"this",
              "methodId":"getIntlMessage()",
              "params":[
                {
                  "_entity":"param",
                  "value":"shared.header.log-in"
                }
              ]
            }
          ]
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"componentWillMount",
            "partName":"16af6fd5-41a3-0fb4-8224-b32212e1105f"
          },
          "actions":[
            {
              "_entity":"call",
              "componentId":"this",
              "methodId":"getIntlMessage()",
              "params":[
                {
                  "_entity":"param",
                  "value":"auth.login.forgot"
                }
              ]
            }
          ]
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"onValidSubmit"
          },
          "actions":[
            {
              "_entity":"call",
              "componentId":"this",
              "methodId":"submitForm",
              "params":[

              ]
            }
          ]
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"onValid"
          },
          "actions":[
            {
              "_entity":"call",
              "componentId":"this",
              "methodId":"enableForm",
              "params":[

              ]
            }
          ]
        },
        {
          "_entity":"rule",
          "condition":{
            "_entity":"event",
            "class":"onInvalid"
          },
          "actions":[
            {
              "_entity":"call",
              "componentId":"this",
              "methodId":"disableForm",
              "params":[

              ]
            }
          ]
        }
      ]
    },
    "content":{

    },
    "style":{
      "properties":[
        {
          "_entity":"property",
          "name":"user",
          "type":"React.PropTypes.object"
        },
        {
          "_entity":"property",
          "name":"locales",
          "type":"React.PropTypes.array"
        },
        {
          "_entity":"property",
          "name":"messages",
          "type":"React.PropTypes.object"
        }
      ]
    }
  }
}
```

## Underlying view model
![View model](/columbus/assets/view-model.jpg)