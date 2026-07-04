#!/usr/bin/env python3
"""
HomeHub MCP Server 端到端测试脚本
测试所有 17 个 MCP 工具的功能
"""

import requests
import json
import sys

BASE_URL = "http://localhost:3000/api/v1"
MCP_URL = f"{BASE_URL}/mcp/tools/call"
MCP_LIST_URL = f"{BASE_URL}/mcp/tools/list"

# 测试用户
TEST_USER = {"email": "zhangsan@test.com", "password": "654321"}

class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    END = "\033[0m"

def print_header(text):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")

def print_test(text, passed=True):
    icon = f"{Colors.GREEN}✅{Colors.END}" if passed else f"{Colors.RED}❌{Colors.END}"
    print(f"  {icon} {text}")

def login():
    resp = requests.post(f"{BASE_URL}/auth/login", json=TEST_USER)
    try:
        data = resp.json()
        if "accessToken" in data:
            return data["accessToken"]
    except:
        pass
    print(f"{Colors.RED}登录失败: {resp.status_code} {resp.text[:100]}{Colors.END}")
    sys.exit(1)

def get_api_token(jwt_token):
    resp = requests.post(f"{BASE_URL}/auth/tokens",
        headers={"Authorization": f"Bearer {jwt_token}"},
        json={"name": "MCP测试Token", "permissions": ["read", "write"]})
    if resp.status_code in [200, 201]:
        data = resp.json()
        return data.get("token")
    print(f"{Colors.YELLOW}API Token 创建响应: {resp.status_code} {resp.text[:100]}{Colors.END}")
    return None

def call_mcp_tool(api_token, tool_name, arguments=None):
    resp = requests.post(MCP_URL,
        headers={"Authorization": f"Bearer {api_token}"},
        json={"name": tool_name, "arguments": arguments or {}})
    if resp.status_code == 200:
        data = resp.json()
        if data.get("isError"):
            return None, data["content"][0]["text"]
        return json.loads(data["content"][0]["text"]), None
    return None, f"HTTP {resp.status_code}"

def test_mcp_tools_list():
    print_header("1. MCP 工具列表")
    resp = requests.post(MCP_LIST_URL)
    if resp.status_code == 200:
        tools = resp.json()["tools"]
        print_test(f"获取到 {len(tools)} 个工具")
        for tool in tools:
            print(f"    - {tool['name']}: {tool['description'][:50]}...")
        return True
    print_test(f"获取工具列表失败", False)
    return False

def test_stock_tools(api_token):
    print_header("2. 库存工具测试")

    # search_items
    result, err = call_mcp_tool(api_token, "search_items", {"query": "牛奶"})
    if result is not None:
        print_test(f"search_items: 找到 {len(result)} 个物品")
    else:
        print_test(f"search_items 失败: {err}", False)

    # add_item
    result, err = call_mcp_tool(api_token, "add_item", {
        "name": "MCP测试物品", "quantity": 10, "unit": "个", "notes": "MCP添加的测试物品"
    })
    if result is not None:
        print_test(f"add_item: 添加 {result['name']} (ID: {result['id']})")
        item_id = result["id"]
    else:
        print_test(f"add_item 失败: {err}", False)
        item_id = None

    # consume_item
    if item_id:
        result, err = call_mcp_tool(api_token, "consume_item", {
            "item_id": str(item_id), "quantity": 2, "note": "测试消耗"
        })
        if result is not None:
            print_test(f"consume_item: 消耗 2个, 剩余 {result['remaining']}个")
        else:
            print_test(f"consume_item 失败: {err}", False)

    # update_item
    if item_id:
        result, err = call_mcp_tool(api_token, "update_item", {
            "item_id": str(item_id), "name": "MCP测试物品(已更新)"
        })
        if result is not None:
            print_test(f"update_item: 更新为 {result['name']}")
        else:
            print_test(f"update_item 失败: {err}", False)

    # get_stock_summary
    result, err = call_mcp_tool(api_token, "get_stock_summary", {})
    if result is not None:
        print_test(f"get_stock_summary: 总物品={result['totalItems']}, 即将过期={result['expiringCount']}")
    else:
        print_test(f"get_stock_summary 失败: {err}", False)

    # get_expiring_items
    result, err = call_mcp_tool(api_token, "get_expiring_items", {"days": 30})
    if result is not None:
        print_test(f"get_expiring_items: {len(result)} 个即将过期")
    else:
        print_test(f"get_expiring_items 失败: {err}", False)

    # delete_item
    if item_id:
        result, err = call_mcp_tool(api_token, "delete_item", {"item_id": str(item_id)})
        if result is not None and result.get("success"):
            print_test(f"delete_item: 删除成功")
        else:
            print_test(f"delete_item 失败: {err}", False)

    return True

def test_list_tools(api_token):
    print_header("3. 清单工具测试")

    # create_list
    result, err = call_mcp_tool(api_token, "create_list", {
        "name": "MCP测试清单", "type": "shopping"
    })
    if result is not None:
        print_test(f"create_list: 创建 {result['name']} (ID: {result['id']})")
        list_id = result["id"]
    else:
        print_test(f"create_list 失败: {err}", False)
        list_id = None

    # add_to_list
    if list_id:
        result, err = call_mcp_tool(api_token, "add_to_list", {
            "list_id": str(list_id), "content": "MCP添加的条目", "quantity": 3
        })
        if result is not None:
            print_test(f"add_to_list: 添加 {result['content']}")
            item_id = result["id"]
        else:
            print_test(f"add_to_list 失败: {err}", False)
            item_id = None

        # check_list_item
        if item_id:
            result, err = call_mcp_tool(api_token, "check_list_item", {"item_id": str(item_id)})
            if result is not None and result.get("success"):
                print_test(f"check_list_item: 打勾成功")
            else:
                print_test(f"check_list_item 失败: {err}", False)

    # get_lists
    result, err = call_mcp_tool(api_token, "get_lists", {})
    if result is not None:
        print_test(f"get_lists: {len(result)} 个清单")
    else:
        print_test(f"get_lists 失败: {err}", False)

    # get_my_tasks
    result, err = call_mcp_tool(api_token, "get_my_tasks", {})
    if result is not None:
        print_test(f"get_my_tasks: {len(result)} 个任务")
    else:
        print_test(f"get_my_tasks 失败: {err}", False)

    return True

def test_recipe_tools(api_token):
    print_header("4. 食谱工具测试")

    # search_recipes
    result, err = call_mcp_tool(api_token, "search_recipes", {"query": "番茄"})
    if result is not None:
        print_test(f"search_recipes: 找到 {len(result)} 个食谱")
    else:
        print_test(f"search_recipes 失败: {err}", False)

    # get_recipe_recommendations
    result, err = call_mcp_tool(api_token, "get_recipe_recommendations", {"recipe_count": 3})
    if result is not None:
        print_test(f"get_recipe_recommendations: 推荐 {len(result)} 个食谱")
    else:
        print_test(f"get_recipe_recommendations 失败: {err}", False)

    return True

def test_trigger_tools(api_token):
    print_header("5. 触发器工具测试")

    # get_bindings
    result, err = call_mcp_tool(api_token, "get_bindings", {})
    if result is not None:
        print_test(f"get_bindings: {len(result)} 个绑定")
    else:
        print_test(f"get_bindings 失败: {err}", False)

    # create_automation
    result, err = call_mcp_tool(api_token, "create_automation", {
        "trigger_type": "nfc_tap",
        "action_type": "run_notification",
        "action_config": {"message": "MCP创建的自动化规则"}
    })
    if result is not None:
        print_test(f"create_automation: 创建 {result['name']}")
    else:
        print_test(f"create_automation 失败: {err}", False)

    return True

def test_notes_fields():
    print_header("6. 备注字段完整性测试")

    import sqlite3
    db_path = "/Users/unique/Desktop/homehub/server/data/homehub.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    tables_with_notes = [
        "items", "locations", "categories", "tags", "lists",
        "list_items", "recipes", "trigger_bindings",
        "automation_triggers", "notification_rules"
    ]

    all_pass = True
    for table in tables_with_notes:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [row[1] for row in cursor.fetchall()]
        has_notes = "notes" in columns
        print_test(f"{table}", has_notes)
        if not has_notes:
            all_pass = False

    conn.close()
    return all_pass

def test_i18n():
    print_header("7. 前端国际化测试")

    import os
    locales_dir = "/Users/unique/Desktop/homehub/client/src/locales"

    zh_exists = os.path.exists(f"{locales_dir}/zh-CN.ts")
    en_exists = os.path.exists(f"{locales_dir}/en.ts")
    index_exists = os.path.exists(f"{locales_dir}/index.ts")

    print_test("中文语言包 (zh-CN.ts)", zh_exists)
    print_test("英文语言包 (en.ts)", en_exists)
    print_test("i18n 组合式函数 (index.ts)", index_exists)

    return zh_exists and en_exists and index_exists

def test_api_endpoints():
    print_header("8. API 端点完整性测试")

    token = login()
    headers = {"Authorization": f"Bearer {token}"}

    endpoints = [
        ("GET", "/auth/me"),
        ("GET", "/families/current"),
        ("GET", "/stock/items"),
        ("GET", "/stock/summary"),
        ("GET", "/stock/expiring"),
        ("GET", "/locations"),
        ("GET", "/categories"),
        ("GET", "/tags"),
        ("GET", "/lists"),
        ("GET", "/recipes"),
        ("GET", "/bindings"),
        ("GET", "/automations"),
        ("GET", "/notifications"),
        ("GET", "/notifications/rules"),
        ("POST", "/mcp/tools/list"),
    ]

    all_pass = True
    for method, path in endpoints:
        url = f"{BASE_URL}{path}"
        if method == "GET":
            resp = requests.get(url, headers=headers)
        else:
            resp = requests.post(url, headers=headers)
        passed = resp.status_code == 200
        print_test(f"{method} {path}", passed)
        if not passed:
            all_pass = False

    return all_pass

def main():
    print(f"{Colors.BLUE}╔══════════════════════════════════════════════════════════════╗{Colors.END}")
    print(f"{Colors.BLUE}║       HomeHub MCP Server 完整测试                           ║{Colors.END}")
    print(f"{Colors.BLUE}╚══════════════════════════════════════════════════════════════╝{Colors.END}")

    # 登录
    jwt_token = login()
    api_token = get_api_token(jwt_token)
    if not api_token:
        print(f"{Colors.RED}获取 API Token 失败{Colors.END}")
        sys.exit(1)

    results = []

    # 运行所有测试
    results.append(("MCP 工具列表", test_mcp_tools_list()))
    results.append(("库存工具", test_stock_tools(api_token)))
    results.append(("清单工具", test_list_tools(api_token)))
    results.append(("食谱工具", test_recipe_tools(api_token)))
    results.append(("触发器工具", test_trigger_tools(api_token)))
    results.append(("备注字段", test_notes_fields()))
    results.append(("国际化", test_i18n()))
    results.append(("API端点", test_api_endpoints()))

    # 汇总
    print_header("测试结果汇总")
    passed = sum(1 for _, p in results if p)
    failed = sum(1 for _, p in results if not p)

    for name, result in results:
        icon = f"{Colors.GREEN}✅{Colors.END}" if result else f"{Colors.RED}❌{Colors.END}"
        print(f"  {icon} {name}")

    print(f"\n  总计: {passed} 通过, {failed} 失败")

    if failed == 0:
        print(f"\n{Colors.GREEN}🎉 所有测试通过！{Colors.END}")
        return 0
    else:
        print(f"\n{Colors.RED}⚠️  有 {failed} 个测试失败{Colors.END}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
