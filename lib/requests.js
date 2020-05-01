<<<<<<< HEAD
module.exports = {
    prefix: '',
    
    _fetch(url, method, body, cbSuccess, cbError, cbFail) {
        let params = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) {
            params.body = JSON.stringify(body);
        }
        fetch(this.prefix + url, params).then(res => res.json())
            .then(json => {
                if (json.success) {
                    if (typeof cbSuccess === 'function') cbSuccess(json);
                }
                else {
                    if (typeof cbError === 'function') cbError(json);
                }
            })
            .catch(err => {
                console.log('Error occured on request ' + this.prefix + url, err);
                if (typeof cbFail === 'function') cbFail(json);
            });
    },

    get(url, success, error, fail) {
        this._fetch(url, 'get', undefined, success, error, fail);
    },
    post(url, body, success, error, fail) { 
        this._fetch(url, 'post', body, success, error, fail);
    },
    put(url, body, success, error, fail) {
        this._fetch(url, 'put', body, success, error, fail);
    },
    delete(url, success, error, fail) {
        this._fetch(url, 'delete', undefined, success, error, fail);
    },
=======
module.exports = {
    prefix: '',
    
    _fetch(url, method, body, cbSuccess, cbError, cbFail) {
        let params = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) {
            params.body = JSON.stringify(body);
        }
        fetch(this.prefix + url, params).then(res => res.json())
            .then(json => {
                if (json.success) {
                    if (typeof cbSuccess === 'function') cbSuccess(json);
                }
                else {
                    if (typeof cbError === 'function') cbError(json);
                }
            })
            .catch(err => {
                log('Error occured on request ' + this.prefix + url, err);
                if (typeof cbFail === 'function') cbFail(json);
            });
    },

    get(url, success, error, fail) {
        this._fetch(url, 'get', undefined, success, error, fail);
    },
    post(url, body, success, error, fail) { 
        this._fetch(url, 'post', body, success, error, fail);
    },
    put(url, body, success, error, fail) {
        this._fetch(url, 'put', body, success, error, fail);
    },
    delete(url, success, error, fail) {
        this._fetch(url, 'delete', undefined, success, error, fail);
    },
>>>>>>> upstream/master
};