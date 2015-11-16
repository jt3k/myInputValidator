// ver 0.001.004.73
(function(factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('inputValidator', ['jquery', 'underscore'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        factory(require('jquery', 'underscore'));
    } else {
        // Browser globals
        factory(jQuery, _);
    }
}(function($, _) {
    /**
     * Чёткий валидатор полей.
     * Валидирует одно поле и делает это хорошо (по крайней мере должен :])
     * @param  {Object}  options  опции валидации
     *
     * @return  {Object]}  Объект манипуляций валидатором
     */
    $.fn.inputValidator = function(options) {
        options = $.extend({
            onError: function(data) {},
            onSuccess: function() {}
        }, options);

        // ||||||||||||||||||||||||||||||||||||||||||||||

        // шина обмена данных модуля (или медиатор)
        var bus = $({});

        // текущий элемент
        var $el = $(this);

        // признак после которого вывод результата больше не производится.
        var resultReturned;
        // Mассивчик методов проверок
        // Внутри методов this указывает на специальный объект с необходимыми свойствами

        // ||||||||||||||||||||||||||||||||||||||||||||||

        var validationFuncs = {
            maxLength: function(maxL) {
                var validationObj = this;

                var value = validationObj.$el.val();

                var assert = value.length <= maxL;

                validationObj.isValid = assert;

                bus.trigger('validated', validationObj);
            },


            required: function() {
                var validationObj = this;
                var value = validationObj.$el.val();
                var assert = !!value.length;

                validationObj.isValid = assert;

                bus.trigger('validated', validationObj);
            },


            ajax: function(ajaxOptions) {
                var validationObj = this;

                $.ajax(ajaxOptions)
                    .always(function(assert, status) {
                        validationObj.isValid = assert;

                        bus.trigger('validated', validationObj);
                    });
            }
        };

        // ||||||||||||||||||||||||||||||||||||||||||||||

        // тик валидации
        bus.on('validated', function(e, data) {
            if (resultReturned) {
                return;
            }

            // вывод ошибок
            (function() {
                var checklist = data.checklist;

                // убираем из чеклиста пункты с пройдеными проверками
                // это необходимо для асинхронных проверятелей и возможно для отладки
                var ruleName = data.ruleName;

                var ruleIndexInChecklist = checklist.indexOf(ruleName);

                //валидные свойства удаляем, не-валидные оставляем
                var isValid = data.isValid;
                if (isValid) {
                    //удаляем 1 элемент по указанному индексу.
                    checklist.splice(ruleIndexInChecklist, 1);
                } else {
                    resultReturned = true;
                    // если возникла ошибка - сообщаем о ней
                    bus.trigger('validation-error', data);
                }

                //когда чеклист пустой - это означает, что все проверки прошли успешно
                if (_.isEmpty(checklist)) {
                    resultReturned = true;
                    bus.trigger('validation-success');
                }
            }());
        });
        // При ошибке валидации
        bus.on('validation-error', function(e, data) {
            options.onError(data);
            promiseResult.reject(data);
        });
        // при успехе валидации
        bus.on('validation-success', function() {
            options.onSuccess();
            promiseResult.resolve();
        });
        // когда не найдено правило
        bus.on('rule-function-not-found', function(e, data) {
            console.warn('rule-function-not-found', data);
        });

        // ||||||||||||||||||||||||||||||||||||||||||||||

        //промис отдаваемый при .doValidate()
        var promiseResult;

        function doValidate() {
            promiseResult = new $.Deferred();

            resultReturned = false;

            var rules = options.rules;

            // делаем массив для проверок валидации ['проверка1', 'проверка2', ...]
            // По нему мы будем узнавать когда пройдут все проверки
            var checklist = _.reduce(rules, function(memo, value, key) {
                memo.push(value.method);
                return memo;
            }, []);

            //запускаем поочерёдно проверки.
            _.each(rules, function(ruleObj) {
                var ruleName = ruleObj.ruleName;
                var ruleValue = ruleObj.value;

                ruleObj.$el = $el;
                ruleObj.checklist = checklist;

                var ruleFunction = validationFuncs[ruleName];

                if (typeof ruleFunction === 'function') {
                    ruleFunction.call(ruleObj, ruleValue);
                } else {
                    bus.trigger('rule-function-not-found', ruleObj);
                }
            });

            return promiseResult;
        }

        // ||||||||||||||||||||||||||||||||||||||||||||||
        var manageObject = {
            doValidate: doValidate,
            _debug: {
                // можно слушать отладочные события
                // 'validation-error'
                // 'validation-success'
                // 'validated'
                // 'rule-function-not-found'
                bus: bus,
                // можно менять извне
                options: options
            }
        };

        $el.data('inputValidator', manageObject);

        return manageObject;
    };
}));


/* *** пример использования *** */
(function() {
    var example = function() {
        var validationObj = $('[name="phone"]').inputValidator({
            rules: [{
                ruleName: 'maxLength',
                value: 11,
                failMessage: 'маловато символов'
            }, {
                ruleName: 'maxLength',
                value: 8,
                failMessage: 'ох, как мало символов'
            }, {
                ruleName: 'required',
                value: true,
                failMessage: 'абезатильное поле, дружищще'

            }, {
                ruleName: 'ajax',
                value: {
                    url: 'https://jsonplaceholder.typicode.com/posts/1',
                    dataFilter: function(data) {
                        data = JSON.parse(data);

                        var bodyIsPresent = (typeof data.body === 'string');

                        return bodyIsPresent;
                    }
                },
                failMessage: 'твой ажакс ругается'
            }],
            onSuccess: function() {
                console.log('onSuccess');
            },
            onError: function(data) {
                console.log('onError', data);
            }
        });

        // *** валидируем вот так
        // в ответ возвращается промис . если он отреджекчен то произошла ошибка (данные ошибке прийдут в аргументе)
        // отрезолвленый промис - это успех (у успеха нет данных в аргументе ))
        var promise = validationObj.doValidate();
        promise.then(function() {
            // успех
        }, function(data) {
            // неудача
        });
    };
}());
