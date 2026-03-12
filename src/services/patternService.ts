import axios from 'axios';

// 预留后端接口调用示例，目前前端本地直接生成图案，未实际调用

export interface RemotePatternRequest {
  imageDataUrl: string;
  params: Record<string, unknown>;
}

export const generatePatternRemote = async (endpoint: string, payload: RemotePatternRequest) => {
  const res = await axios.post(endpoint, payload);
  return res.data;
};

