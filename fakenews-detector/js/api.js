// ============================================================
//  api.js — Camadas de dados VeriFact
//  Depende de auth.js (VF_request, VF_isLoggedIn, etc.)
// ============================================================

const Scans = {
  async save(data) {
    return VF_request('scans.php?action=save', 'POST', data);
  },
  async history(limit, offset) {
    return VF_request('scans.php?action=history&limit=' + (limit||20) + '&offset=' + (offset||0));
  },
  async stats() {
    return VF_request('scans.php?action=stats');
  },
  async delete(id) {
    return VF_request('scans.php?action=delete&id=' + id, 'DELETE');
  }
};

const Reports = {
  async list(limit, offset) {
    return VF_request('reports.php?action=list&limit=' + (limit||20) + '&offset=' + (offset||0));
  },
  async save(scanId, filename, sizeKb) {
    return VF_request('reports.php?action=save', 'POST', { scan_id: scanId, filename, file_size_kb: sizeKb||0 });
  },
  async delete(id) {
    return VF_request('reports.php?action=delete&id=' + id, 'DELETE');
  }
};

// Compatibilidade com código antigo que usa Auth.isLoggedIn()
const Auth = {
  isLoggedIn: () => VF_isLoggedIn(),
  getUser:    () => VF_getUser(),
  logout:     () => VF_logout()
};
