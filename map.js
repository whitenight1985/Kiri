document.addEventListener('DOMContentLoaded', function() {
    var map = L.map('map').setView([35.86166, 104.195397], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 定义不同状态的图标
    var normalIcon = L.icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    var maintenanceIcon = L.icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    fetch('http://localhost:3000/api/servers')
        .then(response => response.json())
        .then(servers => {
            // 添加服务器位置标记
            servers.forEach(function(server) {
                var icon = server.status === '正常' ? normalIcon : maintenanceIcon;
                L.marker([server.latitude, server.longitude], {icon: icon}).addTo(map)
                    .bindPopup('<b>' + server.name + '</b><br>状态: ' + server.status)
                    .on('mouseover', function (e) {
                        this.openPopup();
                    })
                    .on('mouseout', function (e) {
                        this.closePopup();
                    });
            });

            // 添加连接线
            var latlngs = servers.map(server => [server.latitude, server.longitude]);
            var polyline = L.polyline(latlngs, {color: 'red', weight: 2, opacity: 0.5}).addTo(map);
        })
        .catch(error => console.error('获取服务器数据失败:', error));

    // 添加图例
    var legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png" width="12" height="20"> 正常<br>';
        div.innerHTML += '<img src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png" width="12" height="20"> 维护中';
        return div;
    };
    legend.addTo(map);
});