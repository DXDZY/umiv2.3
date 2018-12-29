/**
 * request 网络请求工具
 * 更详细的 api 文档: https://github.com/umijs/umi-request
 */
import { extend } from 'umi-request';
import { notification } from 'antd';
import { getQueryString } from '@/utils/utils';
import moment from 'moment';

const codeMessage = {
  200: '服务器成功返回请求的数据。',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）。',
  204: '删除数据成功。',
  400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
  401: '用户没有权限（令牌、用户名、密码错误）。',
  403: '用户得到授权，但是访问是被禁止的。',
  404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
  406: '请求的格式不可得。',
  410: '请求的资源被永久删除，且不会再得到的。',
  422: '当创建一个对象时，发生一个验证错误。',
  500: '服务器发生错误，请检查服务器。',
  502: '网关错误。',
  503: '服务不可用，服务器暂时过载或维护。',
  504: '网关超时。',
};

/**
 * 异常处理程序
 */
const errorHandler = error => {
  const { response = {} } = error;
  const errortext = codeMessage[response.status] || response.statusText;
  const { status, url } = response;

  notification.error({
    message: `请求错误 ${status}: ${url}`,
    description: errortext,
  });
};
//设置token超时
let timeOut = '';
const setOutTime = () => {
  clearTimeout(timeOut);
  const expire_time = localStorage.getItem('expire_time') && Number.parseInt(localStorage.getItem('expire_time')) * 1000;
  const etime = moment(expire_time);
  const milliseconds = etime.diff(moment(), 'milliseconds');
  timeOut = setTimeout(() => {
    localStorage.removeItem('edison-token');
    localStorage.removeItem('token');
    localStorage.removeItem('expire_time');
  }, milliseconds);
}
//超时前5分钟内有接口请求，重新获取token
const checkExpirtTime = () => {
  const expire_time = localStorage.getItem('expire_time') && Number.parseInt(localStorage.getItem('expire_time')) * 1000;
  if (expire_time) {
    const etime = moment(expire_time);
    const nowtime = moment(Date.now()).add(5, 'm');
    if (nowtime.isAfter(etime)) {
      return true;
    }
    return false;
  }
  return true;
}
const goLogin = () => {
  // window.g_app._store.dispatch({
  //   type: 'login/logoutForCode',
  // });
  localStorage.removeItem('edison-token');
  localStorage.removeItem('token');
  localStorage.removeItem('expire_time');
  const reg = /edison\.xin\.com/ig;
  const reg1 = /edison\.uat\.xin\.com/ig;
  if (reg.test(location.hostname) || reg1.test(location.hostname)) {
    window.location.href = '//sso.xin.com/login?callback=' + location.origin;
  } else {
    window.location.href = '//trunk.sso.test.xin.com/login?callback=' + location.origin;
  }
}
//用ssotoken获取实际token
const getToken = refresh => {
  return (
    request('/fe/common/get_token', {
      method: 'post',
      data: {
        refresh,
      },
      headers: {
        ssotoken: getQueryString('token') || '',
        edisontoken: localStorage.getItem('edison-token') || '',
      },
      checkToken: false,
    })
  )
}
//验证token
async function checkToken(params) {
  if (getQueryString('token')) {
    localStorage.setItem('edison-token', getQueryString('token'));
  }
  if (localStorage.getItem('edison-token')) {
    const expire_time = localStorage.getItem('expire_time')
    if (!expire_time || checkExpirtTime()) {
      const response = await getToken(!expire_time ? 0 : 1);
      if (response.ret === 1) {
        if (getQueryString('token')) {
          window.history.pushState('', '', '/');
        }
        localStorage.setItem('edison-token', response.data.token);
        localStorage.setItem('expire_time', response.data.expire_time);
        localStorage.setItem('create_time', response.data.create_time);
        setOutTime()
      }
    }
  } else {
    goLogin()
  }
}
/**
 * 配置request请求时的默认参数
 */
const request = extend({
  errorHandler, // 默认错误处理
  credentials: 'include', // 默认请求是否带上cookie
  requestType: 'form', //form表单形式请求
});
request.interceptors.request.use((url, options) => {
  if (options.checkToken === false) {
    return (
      {
        url,
        options,
      }
    )
  } else {
    checkToken();
    return (
      {
        url,
        options,
      }
    )
  }
});

export default request;
