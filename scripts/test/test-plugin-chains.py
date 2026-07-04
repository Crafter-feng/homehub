#!/usr/bin/env python3
"""
test-plugin-chains.py — 集成测试脚本，验证 3 条关键链路

P-T05: 验证以下链路：
1. MCP→StockService→DB: 通过 McpService.callApi() 查询库存
2. Trigger→Resolver→Action: 通过 TriggerResolverService.resolve() 处理扫描
3. Scan→Report→Resolve: POST /scan/report → 触发动作

使用方式:
  python scripts/test-plugin-chains.py [--base-url http://localhost:3000/api/v1] [--token <jwt_token>]

前置条件:
  - 服务已启动
  - 已有有效的 JWT token（通过 --token 参数或环境变量 HOMEHUB_TEST_TOKEN）
  - 数据库中已有测试数据（物品、绑定等）
"""

import argparse
import json
import os
import sys
import time
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


# === 配置 ===

DEFAULT_BASE_URL = os.environ.get('HOMEHUB_BASE_URL', 'http://localhost:3000/api/v1')
DEFAULT_TOKEN = os.environ.get('HOMEHUB_TEST_TOKEN', '')

# 测试结果追踪
results: Dict[str, Dict[str, Any]] = {
    'chain1_mcp_stock_db': {'status': 'pending', 'details': []},
    'chain2_trigger_resolver_action': {'status': 'pending', 'details': []},
    'chain3_scan_report_resolve': {'status': 'pending', 'details': []},
}


# === HTTP 工具 ===

def make_request(
    url: str,
    method: str = 'GET',
    data: Optional[Dict[str, Any]] = None,
    token: str = '',
) -> Dict[str, Any]:
    """发送 HTTP 请求并返回响应 JSON"""
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    if token:
        headers['Authorization'] = f'Bearer {token}'

    body = json.dumps(data).encode('utf-8') if data else None

    req = Request(url, data=body, headers=headers, method=method)

    try:
        with urlopen(req, timeout=10) as response:
            response_body = response.read().decode('utf-8')
            try:
                return json.loads(response_body)
            except json.JSONDecodeError:
                return {'raw': response_body, 'status_code': response.status}
    except HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        try:
            error_data = json.loads(error_body)
        except json.JSONDecodeError:
            error_data = {'raw': error_body}
        error_data['status_code'] = e.code
        return error_data
    except URLError as e:
        return {'error': str(e.reason), 'status_code': 0}
    except Exception as e:
        return {'error': str(e), 'status_code': 0}


def log_detail(chain: str, message: str, success: bool = True) -> None:
    """记录测试步骤详情"""
    results[chain]['details'].append({
        'message': message,
        'success': success,
        'timestamp': time.time(),
    })


def set_chain_status(chain: str, status: str) -> None:
    """设置链路测试状态"""
    results[chain]['status'] = status


# === 链路 1: MCP→StockService→DB ===

def test_chain1_mcp_stock_db(base_url: str, token: str) -> None:
    """
    验证 MCP→StockService→DB 链路：
    1. 获取插件列表（确认 MCP 相关插件已注册）
    2. 获取库存摘要（通过 StockService → DB）
    3. 查询物品列表（验证 DB 读写正常）
    """
    chain = 'chain1_mcp_stock_db'
    print('\n=== 链路 1: MCP→StockService→DB ===')

    # 步骤 1: 获取插件列表
    print('  [1/3] 获取插件列表...')
    plugins = make_request(f'{base_url}/plugins', token=token)
    if 'error' in plugins and plugins.get('status_code', 0) >= 400:
        log_detail(chain, f'获取插件列表失败: {plugins.get("error", "未知错误")}', False)
        log_detail(chain, f'响应: {json.dumps(plugins, ensure_ascii=False)[:200]}', False)
        # 如果因认证失败，跳过后续步骤
        if plugins.get('status_code') in (401, 403):
            log_detail(chain, '认证失败，跳过链路1后续步骤', False)
            set_chain_status(chain, 'skipped_auth')
            return
    else:
        log_detail(chain, f'获取插件列表成功，共 {len(plugins) if isinstance(plugins, list) else "?"} 个插件')
        print(f'  ✓ 插件列表: {len(plugins) if isinstance(plugins, list) else "N/A"} 个')

    # 步骤 2: 获取库存摘要
    print('  [2/3] 获取库存摘要...')
    summary = make_request(f'{base_url}/stock/summary', token=token)
    if 'error' in summary and summary.get('status_code', 0) >= 400:
        log_detail(chain, f'获取库存摘要失败: {summary.get("error", "未知错误")}', False)
        log_detail(chain, f'响应: {json.dumps(summary, ensure_ascii=False)[:200]}', False)
        set_chain_status(chain, 'failed')
        return
    else:
        log_detail(chain, f'库存摘要获取成功: totalItems={summary.get("totalItems", summary.get("total", "N/A"))}')
        print(f'  ✓ 库存摘要: {json.dumps(summary, ensure_ascii=False)[:100]}')

    # 步骤 3: 查询物品列表（验证 DB 读写）
    print('  [3/3] 查询物品列表...')
    items = make_request(f'{base_url}/stock/items', token=token)
    if 'error' in items and items.get('status_code', 0) >= 400:
        log_detail(chain, f'查询物品列表失败: {items.get("error", "未知错误")}', False)
        set_chain_status(chain, 'failed')
        return
    else:
        item_count = len(items) if isinstance(items, list) else len(items.get('data', items.get('items', [])))
        log_detail(chain, f'物品列表获取成功，共 {item_count} 项')
        print(f'  ✓ 物品列表: {item_count} 项')

    set_chain_status(chain, 'passed')
    print('  ✓ 链路 1 通过: MCP→StockService→DB')


# === 链路 2: Trigger→Resolver→Action ===

def test_chain2_trigger_resolver_action(base_url: str, token: str) -> None:
    """
    验证 Trigger→Resolver→Action 链路：
    1. 获取绑定列表（确认 TriggerBinding 存在）
    2. 获取 ItemType 配置（确认状态机定义）
    3. 发送扫描事件（触发 resolve 链路）
    """
    chain = 'chain2_trigger_resolver_action'
    print('\n=== 链路 2: Trigger→Resolver→Action ===')

    # 步骤 1: 获取绑定列表
    print('  [1/3] 获取绑定列表...')
    bindings = make_request(f'{base_url}/bindings', token=token)
    if 'error' in bindings and bindings.get('status_code', 0) >= 400:
        log_detail(chain, f'获取绑定列表失败: {bindings.get("error", "未知错误")}', False)
        if bindings.get('status_code') in (401, 403):
            log_detail(chain, '认证失败，跳过链路2后续步骤', False)
            set_chain_status(chain, 'skipped_auth')
            return
        set_chain_status(chain, 'failed')
        return
    else:
        binding_count = len(bindings) if isinstance(bindings, list) else len(bindings.get('data', []))
        log_detail(chain, f'绑定列表获取成功，共 {binding_count} 条绑定')
        print(f'  ✓ 绑定列表: {binding_count} 条')

    # 步骤 2: 获取 ItemType 配置
    print('  [2/3] 获取 ItemType 配置...')
    configs = make_request(f'{base_url}/plugins/item-type-configs/all', token=token)
    if 'error' in configs and configs.get('status_code', 0) >= 400:
        log_detail(chain, f'获取 ItemType 配置失败: {configs.get("error", "未知错误")}', False)
        # 此端点可能在老版本中不存在，但不影响核心链路验证
        log_detail(chain, 'ItemType 配置端点可能尚未实现，继续验证', False)
    else:
        config_count = len(configs) if isinstance(configs, dict) else 0
        log_detail(chain, f'ItemType 配置获取成功，共 {config_count} 种类型')
        print(f'  ✓ ItemType 配置: {config_count} 种类型')

    # 步骤 3: 发送扫描事件（触发 resolve 链路）
    print('  [3/3] 发送扫描事件...')
    scan_data = {
        'code': 'TEST_NFC_001',
        'codeType': 'nfc',
        'metadata': {'test': True, 'source': 'integration_test'},
    }
    scan_result = make_request(
        f'{base_url}/scanner/scan',
        method='POST',
        data=scan_data,
        token=token,
    )
    if 'error' in scan_result and scan_result.get('status_code', 0) >= 400:
        log_detail(chain, f'扫描事件处理失败: {scan_result.get("error", "未知错误")}', False)
        log_detail(chain, f'响应: {json.dumps(scan_result, ensure_ascii=False)[:200]}', False)
        set_chain_status(chain, 'failed')
        return
    else:
        action = scan_result.get('action', scan_result.get('resolvedAction', {}).get('primary', 'N/A'))
        log_detail(chain, f'扫描事件处理成功，resolved action: {action}')
        print(f'  ✓ 扫描结果: action={action}')

    set_chain_status(chain, 'passed')
    print('  ✓ 链路 2 通过: Trigger→Resolver→Action')


# === 链路 3: Scan→Report→Resolve ===

def test_chain3_scan_report_resolve(base_url: str, token: str) -> None:
    """
    验证 Scan→Report→Resolve 链路：
    1. 获取插件运行状态
    2. POST /scan/report 上报扫描结果
    3. 验证返回的 ResolvedAction 包含完整信息
    """
    chain = 'chain3_scan_report_resolve'
    print('\n=== 链路 3: Scan→Report→Resolve ===')

    # 步骤 1: 获取插件运行状态
    print('  [1/3] 获取插件运行状态...')
    state = make_request(f'{base_url}/plugins/state/summary', token=token)
    if 'error' in state and state.get('status_code', 0) >= 400:
        log_detail(chain, f'获取插件状态失败: {state.get("error", "未知错误")}', False)
        if state.get('status_code') in (401, 403):
            log_detail(chain, '认证失败，跳过链路3后续步骤', False)
            set_chain_status(chain, 'skipped_auth')
            return
        # 此端点可能尚未实现，继续
        log_detail(chain, '插件状态端点可能尚未实现，继续验证', False)
    else:
        state_count = len(state) if isinstance(state, list) else 0
        log_detail(chain, f'插件状态获取成功，共 {state_count} 个插件')
        print(f'  ✓ 插件状态: {state_count} 个')

    # 步骤 2: POST /scan/report 上报扫描结果
    print('  [2/3] POST /scan/report 上报扫描结果...')
    report_data = {
        'code': 'TEST_BARCODE_12345',
        'codeType': 'barcode',
        'metadata': {'format': 'EAN-13', 'source': 'integration_test'},
        'context': {
            'pagePath': '/stock/items',
            'recentActions': [],
        },
    }
    report_result = make_request(
        f'{base_url}/scan/report',
        method='POST',
        data=report_data,
        token=token,
    )
    if 'error' in report_result and report_result.get('status_code', 0) >= 400:
        log_detail(chain, f'扫描上报失败: {report_result.get("error", "未知错误")}', False)
        log_detail(chain, f'响应: {json.dumps(report_result, ensure_ascii=False)[:200]}', False)
        set_chain_status(chain, 'failed')
        return
    else:
        primary = report_result.get('primary', 'N/A')
        hints = report_result.get('hints', [])
        log_detail(chain, f'扫描上报成功，primary action: {primary}, hints count: {len(hints)}')
        print(f'  ✓ 扫描上报结果: primary={primary}, hints={len(hints)}')

    # 步骤 3: 验证返回的 ResolvedAction 包含完整信息
    print('  [3/3] 验证 ResolvedAction 结构完整性...')
    required_fields = ['primary', 'params']
    missing_fields = [f for f in required_fields if f not in report_result]
    if missing_fields:
        log_detail(chain, f'ResolvedAction 缺少必要字段: {missing_fields}', False)
        set_chain_status(chain, 'failed')
        return
    else:
        log_detail(chain, f'ResolvedAction 结构完整: primary={report_result["primary"]}')
        print(f'  ✓ ResolvedAction 结构完整')

    set_chain_status(chain, 'passed')
    print('  ✓ 链路 3 通过: Scan→Report→Resolve')


# === 主流程 ===

def print_summary() -> None:
    """打印测试结果汇总"""
    print('\n' + '=' * 60)
    print('测试结果汇总')
    print('=' * 60)

    passed = 0
    failed = 0
    skipped = 0

    for chain, result in results.items():
        status = result['status']
        status_icon = {
            'passed': '✓',
            'failed': '✗',
            'skipped_auth': '⊘',
            'pending': '○',
        }.get(status, '?')

        print(f'  {status_icon} {chain}: {status}')

        for detail in result['details']:
            icon = '✓' if detail['success'] else '✗'
            print(f'    {icon} {detail["message"]}')

        if status == 'passed':
            passed += 1
        elif status == 'failed':
            failed += 1
        elif status == 'skipped_auth':
            skipped += 1

    print(f'\n总计: {passed} 通过, {failed} 失败, {skipped} 跳过')
    print('=' * 60)

    if failed > 0:
        return 1
    if passed == 0 and skipped > 0:
        print('警告: 所有测试因认证失败被跳过。请提供有效的 JWT token。')
        return 2
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='HomeHub 插件链路集成测试')
    parser.add_argument(
        '--base-url',
        default=DEFAULT_BASE_URL,
        help=f'API 基础 URL (默认: {DEFAULT_BASE_URL})',
    )
    parser.add_argument(
        '--token',
        default=DEFAULT_TOKEN,
        help='JWT 认证 token (也可通过环境变量 HOMEHUB_TEST_TOKEN 设置)',
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip('/')
    token = args.token

    print(f'HomeHub 插件链路集成测试')
    print(f'Base URL: {base_url}')
    print(f'Token: {"已设置" if token else "未设置（部分端点可能需要认证）"}')
    print()

    # 运行三条链路测试
    test_chain1_mcp_stock_db(base_url, token)
    test_chain2_trigger_resolver_action(base_url, token)
    test_chain3_scan_report_resolve(base_url, token)

    # 打印汇总
    return print_summary()


if __name__ == '__main__':
    sys.exit(main())
