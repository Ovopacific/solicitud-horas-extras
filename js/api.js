window.appApi = {
  async fetchAPI(action, payload) {
    const response = await fetch(window.appConfig.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });
    return response.json();
  }
};
