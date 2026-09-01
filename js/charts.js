var chartInstance = null;

function renderChart(data, dimension, chartType) {
    var container = document.getElementById('chartContainer');
    if (!chartInstance) {
        chartInstance = echarts.init(container);
    }

    var labels = data.map(function(d) { return d.label; });
    var values = data.map(function(d) { return d.count; });

    var dimLabels = { dept: '人员部门', level: '人员层级', user_type: '人员类型' };

    var option = {
        title: {
            text: '调用次数统计（按' + (dimLabels[dimension] || dimension) + '）',
            left: 'center',
            textStyle: { fontSize: 14 }
        },
        tooltip: { trigger: 'axis' },
        legend: { show: chartType === 'pie' },
        xAxis: chartType === 'pie' ? null : {
            type: 'category',
            data: labels,
            axisLabel: { rotate: labels.length > 5 ? 30 : 0 }
        },
        yAxis: chartType === 'pie' ? null : {
            type: 'value',
            name: '调用次数',
            minInterval: 1
        },
        series: [{
            name: '调用次数',
            type: chartType,
            data: labels.map(function(label, i) {
                return chartType === 'pie'
                    ? { name: label, value: values[i] }
                    : values[i];
            }),
            radius: chartType === 'pie' ? ['30%', '65%'] : undefined,
            center: chartType === 'pie' ? ['50%', '55%'] : undefined,
            label: {
                show: chartType === 'pie',
                formatter: '{b}: {c} ({d}%)'
            },
            itemStyle: {
                borderRadius: chartType === 'bar' ? [4, 4, 0, 0] : undefined
            }
        }]
    };

    chartInstance.setOption(option, true);

    window.addEventListener('resize', function() {
        chartInstance && chartInstance.resize();
    });
}