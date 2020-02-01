function Promise(excuter) {
    // 给 promise 定义状态
    this.status = 'pending'
    // 成功和失败的原因
    this.value = undefined
    this.reason = undefined

    let _this = this

    // 定义两个队列 存放对应的回调
    _this.onResolveCallbacks = []
    _this.onRejectedCallbacks = []

    function resolve(value) {
        if (value instanceof Promise) {
            return value.then(resolve, reject)
        }
        if (_this.status === 'pending') {
            _this.value = value
            _this.status = 'fulfilled'
            _this.onResolveCallbacks.forEach(fn => fn())
        }
    }

    function reject(reason) {
        if (_this.status === 'pending') {
            _this.reason = reason
            _this.status = 'rejected'
            _this.onRejectedCallbacks.forEach(fn => fn())
        }
    }

    // 执行器会立刻执行
    try {
        excuter(resolve, reject)
    } catch (err) {
        // 如果报错 调用 then 方法的失败方法即可
        reject(err)
    }

}

function resolvePromise(promise2, x, resolve, reject) {
    // promise2 就是当前 then 返回的 promise
    // x 就是当前 then 中成功或者失败回调的返回结果


    // 对 x 进行判断 如果 x 是一个普通值 直接 resolve 就可以了
    // 如果 x 是一个 promise 采用 x 的状态
    if (promise2 === x) {
        return reject(new TypeError('循环引用'))
    }

    // 这种情况就有了能 x 是一个 promise 了
    if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
        let called
        try {
            // 看当前的 promise 有没有 then 方法 有可能取 then 的时候报错
            let then = x.then
            if (typeof then === 'function') { // 如果是一个 promise
                // 用刚才取出的 then 方法 不要再去取值了 如果再取可能又会发生异常
                then.call(x, y => {
                    if (called) return
                    called = true
                    // 如果返回的是一个 promise 这个 promise resolve 的结果可能还是一个 promise 递归解析直到这个 y 是一个常量为止
                    resolvePromise(promise2, y, resolve, reject)
                }, r => {
                    if (called) return // 防止调用失败 又调用成功
                    called = true
                    reject(r)
                })
            } else {
                resolve(x)
            }
        } catch (e) {
            if (called) return
            called = true
            reject(e)
        }
    } else {
        resolve(x)
    }
}

// onfulfilled，onrejected 必须异步执行 then 方法是异步的
Promise.prototype.then = function (onfulfilled, onrejected) {
    onfulfilled = typeof onfulfilled === 'function' ? onfulfilled : val => val
    onrejected = typeof onrejected === 'function' ? onrejected : err => {
        throw err
    }
    let _this = this
    // 返回新的 promise 让当前的 then 方法执行后可以继续 then
    let promise2 = new Promise(function (resolve, reject) {
        if (_this.status === 'fulfilled') { // 如果状态成功，调成功的回调
            setTimeout(() => {
                try {
                    let x = onfulfilled(_this.value)
                    resolvePromise(promise2, x, resolve, reject)
                } catch (e) {
                    reject(e)
                }

            })
        }
        if (_this.status === 'rejected') { // 如果状态失败，调失败的回调
            setTimeout(() => {
                try {
                    let x = onrejected(_this.reason)
                    resolvePromise(promise2, x, resolve, reject)
                } catch (e) {
                    reject(e)
                }
            })
        }

        if (_this.status === 'pending') {
            _this.onResolveCallbacks.push(function () {
                setTimeout(() => {
                    try {
                        let x = onfulfilled(_this.value)
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                })
            })
            _this.onRejectedCallbacks.push(function () {
                setTimeout(() => {
                    try {
                        let x = onrejected(_this.reason)
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                })
            })
        }
    })
    return promise2
}

// catch 是 then 的简写
Promise.prototype.catch = function (errCallback) {
    return this.then(null, errCallback)
}
// npm install promises-aplus-tests -g
// promises-aplus-tests index.js
Promise.deferred = function () {
    let dfd = {}
    dfd.promise = new Promise((resolve, reject) => {
        dfd.resolve = resolve
        dfd.reject = reject
    })
    return dfd
}

Promise.resolve = function (value) {
    return new Promise((resolve, reject) => {
        resolve(value)
    })
}

Promise.reject = function (reason) {
    return new Promise((resolve, reject) => {
        reject(reason)
    })
}

Promise.all = function (values) {
    return new Promise((resolve, reject) => {
        let arr = []
        let count = 0

        function processData(key, value) {
            arr[key] = value
            if (++count === values.length) {
                resolve(arr)
            }
        }

        for (let i = 0; i < values.length; i++) {
            let current = values[i]
            let then = current.then
            if (then && typeof then === 'function') { // 是一个 promise
                then.call(current, y => { // 是 promise 就让 promise 执行
                    processData(i, y)
                }, reject)
            } else {
                processData(i, current) // 常量直接返回即可
            }
        }
    })
}

Promise.race = function (values) {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < values.length; i++) {
            let current = values[i]
            let then = current.then
            if (then && typeof then === 'function') { // 是一个 promise
                then.call(current, y => { // 是 promise 就让 promise 执行
                    resolve(y)
                }, reject)
            } else {
                resolve(current) // 常量直接返回即可
            }
        }
    })
}

// 把方法 promise 化
Promise.promisify = function (fn) {
    return function () {
        return new Promise((resolve, reject) => {
            fn(...arguments, function (err, data) {
                if (err) reject(err)
                resolve(data)
            })
        })
    }
}

//export default Promise
module.exports = Promise