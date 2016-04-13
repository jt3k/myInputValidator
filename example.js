'use strict';
//////////////////////////////////////////////////////////////////////////////////////////////
/// ДАННЫЕ ДЛЯ ВАЛИДАТОРА ФОРМЫ                                                             //
//////////////////////////////////////////////////////////////////////////////////////////////

var validatorData = {
    login: {
        name: 'login',
        validators: [{
            validate: function(value) {
                return !!value;
            },
            message: '0',
            validators: [{
                validate: function(value) {
                    return !!value;
                },
                message: '0.1',
                validators: [{
                    validate: function(value) {
                        return !!value;
                    },
                    message: '0.1.1',
                    validators: []
                }]
            }, {
                validate: function(value) {
                    return !!value;
                },
                message: '0.2',
                validators: []
            }]
        }, {
            validate: function(value) {
                return !!value;
            },
            message: '1',
            validators: [{
                validate: function(value) {
                    return new Promise(function(resolve, reject) {
                        setTimeout(function() {
                                resolve()
                            }, 333)
                            // reject();
                    });
                },
                message: '1.1',
                validators: []
            }, {
                validate: function(value) {
                    // return Promise.reject('Блин, всё упало');
                    // return Promise.reject();
                    return true;
                },
                message: '1.2',
                validators: []
            }]
        }, {
            validate: function(value) {
                return !!value;
            },
            message: '3',
        }]
    },
    password: {
        name: 'password',
        validators: [{
            validate: function(value) {
                return !!value;
            },
            message: '0',
            validators: [{
                validate: function(value) {
                    return !!value;
                },
                message: '0.1',
                validators: []
            }, {
                validate: function(value) {
                    return !!value;
                },
                message: '0.2',
                validators: []
            }]
        }]
    },
    month: {
        name: 'month',
        validators: [{
            validate: function(value) {
                return !!value;
            },
            message: '4',
            validators: []
        }]
    },
    year: {
        name: 'year',
        validators: [{
            validate: function(value) {
                return !!value;
            },
            message: '5',
            validators: []
        }]
    },
};


//////////////////////////////////////////////////////////////////////////////////////////////
/// EXAMPLE                                                                                 //
//////////////////////////////////////////////////////////////////////////////////////////////

var form = document.querySelector('form');

button.onclick = function() {
    // Данные взятые из формы конвертируем в объект (для удобного дрступа к свойствам)
    let formData = $(form).serializeArray()
        .reduce(function(memo, item) {
            memo[item.name] = item.value;
            return memo;
        }, {});


    validateEachFieldInForm(formData, validatorData)
        .then(checkDateIsNotFuture)
        .then(showResult)
        .then(function(fieldsObj) {
            console.log('Валидация завершена', fieldsObj);
        });
}

//////////////////////////////////////////////////////////////////////////////////////////////
/// МИДЛВЭРЫ ДЛЯ ПРОМИСОВ                                                                   //
//////////////////////////////////////////////////////////////////////////////////////////////

function checkDateIsNotFuture(fieldsObj) {
    let validatorMonth = fieldsObj.month;
    let validatorYear = fieldsObj.year;

    // если год и месяц удовлетваряют условиям их валидаторов, проверяем будущее %)
    if (validatorYear._isValid && validatorMonth._isValid) {
        let year = validatorYear._value;
        let month = validatorMonth._value;

        const isFuture = isFutureDate(month, year);
        if (!isFuture) {
            // если не будущее то пишем ошибку
            validatorMonth._errorMessage = 'карта просрочена';
            validatorMonth._isValid = false;

        } else {
            // если будущее то убираем ошибку
            delete validatorMonth._errorMessage;
            validatorMonth._isValid = true;
        }
    }


    // =======================
    /**
     * Эта функция предсказывает будущее
     * @param  {String|Number}  month  Месяц
     * @param  {String|Number}  year   Год
     * @return  {Boolean}  false если прошедшая дата
     */
    function isFutureDate(month, year) {
        month = String(month);
        year = String(year);

        if (!month || !year) {
            return;
        }

        // нам нужен год в полном формате. Поэтому достраиваем
        // его до full отрезав 2 первых символа от текущего года
        if (year.length === 2) {
            let firstPartOfFullYear = new Date().getFullYear().toString().slice(0, 2);
            year = `${firstPartOfFullYear}${year}`;
        }

        const cur = new Date().valueOf(); // текущая дата в милисекундах
        // дата минус одна милисекунда
        const usr = new Date(new Date(year, month).valueOf() - 1).valueOf();
        return cur < usr; // сравниваем кол-во милисекунд с начала эпохи unix
    }


    return fieldsObj;
}

function showResult(fieldsObj) {
    let errorStr = _.reduce(fieldsObj, function(memo, field) {
        if (!field._isValid) {
            memo += field._errorMessage + ', ';
        }
        return memo;
    }, '');

    errorStr = errorStr.replace(/, $/, '.');
    out.innerHTML = errorStr;
    return fieldsObj;
}

// console.log('validatorsPromise', validatorsPromise);