(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['lodash'], factory);
    } else {
        // Browser globals
        root.validateEachFieldInForm = factory(root._);
    }
}(this, function(_) {
    /**
     * Рекурсивно обходит дерево массивов валидаторов,
     * и создаёт плоскую коллекцию валидаторов.
     *
     * @param  {Array}  validators    Массив валидаторов
     * @return {Array}                Плоская коллекция элементов {validate,message}
     */
    function validatorsTreeToFlatArray(validators) {
        /**
         * Рекурсивный бход дерева чтобы построить плоский массив.
         *
         * @param  {Array}  arr     Древовидный массив валидаторов
         * @param  {Number}  _deep  Глубина рекурсии
         * @param  {Array}  _memo   Накопитель найденных валидаторов
         * @return {Array}          Плоская коллекция элементов {validate,message}
         */
        function req(arr, _deep, _memo) {
            _memo = _memo || [];
            _deep = ++_deep || 0;

            arr.forEach(function(checker) {
                ////////////////////////////////////////////////////
                // комментарий для информации что внутри checkers //
                ////////////////////////////////////////////////////
                /*
                checker = {
                    validate: function(value) {
                        return !!value;
                    },
                    message: 'msg',
                    validators: [] // здесь массив объектов checker
                }
                */
                if (checker.message && checker.validate) {
                    _memo.push({
                        validate: checker.validate,
                        message: checker.message
                    });
                }

                if (checker.validators) {
                    req(checker.validators, _deep, _memo);
                }
            });

            if (_deep === 0) {
                return _memo;
            }
        }

        return req(validators);
    }


    /**
     * Функция поочерёдно валидирует значение переданными_массивом_валидаторами
     * Если одна из проверок не прошла, то в .catch попадёт текст ошибки.
     *
     * @param  {Array}  validatorsArray   Плоский массив валидаторов
     * @param  {Mixed}  value             Значение которое будет проверяться в валидаторах
     * @return  {Promise}                 Промис-объект
     * Данный промис не реджектит если произойдёт ошибка валидации. Он только установит значение
     */
    function validateValueSequentialByValidatorsArray(validatorsArray, value) {
        var executeSequentially = Promise.resolve(value);

        validatorsArray.forEach(function(checker) {
            executeSequentially = executeSequentially.then(function(value) {
                var result = checker.validate(value);

                return new Promise(function(resolve, reject) {
                    // если результат это промисообразный(then'able) объект
                    if (result.then) {
                        result = result
                            .catch(function(errorMessage) {
                                // если из валидатора ничего не пришло то будет использовано сообщение из текущего чекера
                                errorMessage = errorMessage || checker.message;
                                reject(errorMessage);
                            })
                            .then(function() {
                                resolve(value); //передаём значение в следующий зэн
                            });

                        return result;
                    }
                    // если результатом является булево значение
                    // то реджектим в случае если false
                    else {
                        if (result === true) {
                            resolve(value); //передаём значение в следующий зэн
                        } else {
                            reject(checker.message);
                        }
                    }
                });
            });
        });
        return executeSequentially;
    }

    /**
     * На вход массив валидаторов и значение, на выход промис который зарезолвится когда все проверки завершатся (включая асинхронные)
     * @param  {Array}  validators  Массив валидаторов (может быть с вложенными валидаторами)
     * @param  {String}  value      Проверяемое значение
     * @return {Promise}            Промис который зарезолвится когда все проверки завершатся
     */
    function doValidateField(validators, value) {
        // Плоский список валидаторов определённого поля
        var array = validatorsTreeToFlatArray(validators);
        // console.log('validatorsArray', array);

        //создаём массифчик вложенных друг в друга промисов.
        var promise = validateValueSequentialByValidatorsArray(array, value);
        return promise;
    }


    /**
     * Проверяем каждое поле формы валидаторами.Когда все поля будут проверены промис зарезолвится.
     * Данный промис зареджектится только если произойдёт какая-либо ошибка в обработчиках.
     * То есть мы не делаем reject при непрошедший ошибке валидации.
     * @param  {DOM-Element}  formData              Данные формы которую валидируем
     * @param  {Object}       validationFields      Объект с правилами валидаци
     * @return  {Promise}  Промис который зарезолвится когда все поля будут проверены.
     */
    function validateEachFieldInForm(formData, validationFields) {
        var promises = _.map(validationFields, function(field, fieldName) {

            var inputValue = formData[fieldName];

            var inputValidator = field.validators;

            // Сохраняем значение которое проверяем
            field._value = inputValue

            // как только промис поля зарезолвился/зареджектился - помечаем его _isValid
            var validatorsPromise = doValidateField(inputValidator, inputValue)
                .then(function() {
                    field._isValid = true;
                })
                .catch(function(message) {
                    field._isValid = false;
                    field._errorMessage = message;
                    // нам не нужно чтобы данный промис(var promises) зареджектился
                    // поетому из кэтча возвращаем значение.
                    return field;
                });

            return validatorsPromise;
        });

        return Promise.all(promises)
            .then(function() {
                // когда все проверки завершатся,
                // пользователь промиса получит объект
                // валидатора с навешаными свойствами
                return validationFields;
            });
    }


    return validateEachFieldInForm;
}));