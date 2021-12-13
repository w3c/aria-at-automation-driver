#include "pch.h"
#include "CppUnitTest.h"
#include "../src/automationttsengine/ttsengutil.h"]
#include <Windows.h>

using namespace Microsoft::VisualStudio::CppUnitTestFramework;

HRESULT readFile(const wchar_t* filepath, wchar_t** dest, size_t* destBytes);

namespace UnitTest1
{
	TEST_CLASS(UnitTest1)
	{
	public:
		
		TEST_METHOD(log)
		{
			HANDLE file = CreateFileW(L"C:\\Program Files\\Bocoup Automation Voice\\test-log.txt", GENERIC_WRITE, FILE_SHARE_READ, NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
			Assert::AreNotEqual(INVALID_HANDLE_VALUE, file, L"Open a file to log to.");
			::log(file, L"Test!\n");
			CloseHandle(file);
			wchar_t* fileBuffer = NULL;
			size_t fileBytes = 0;
			Assert::AreEqual(S_OK, readFile(L"C:\\Program Files\\Bocoup Automation Voice\\test-log.txt", &fileBuffer, &fileBytes));
			Assert::AreEqual(L"Test!\n", fileBuffer);
			LocalFree(fileBuffer);
		}

		TEST_METHOD(emit)
		{
			auto hr = ::emit(MessageType::LIFECYCLE, std::string("Test."));
		}
	};
}

wchar_t readFileBuffer[4096];
HRESULT readFile(const wchar_t* filepath, wchar_t** dest, size_t* destBytes) {
	HANDLE file = CreateFileW(filepath, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
	if (file == INVALID_HANDLE_VALUE) {
		*dest = (wchar_t*) LocalAlloc(LPTR, 1 * sizeof(wchar_t));
		*destBytes = sizeof(wchar_t);
		return E_HANDLE;
	}
	*dest = (wchar_t*) LocalAlloc(LPTR, 1 * sizeof(wchar_t));
	if (*dest == NULL) {
		*destBytes = 0;
		auto result = HRESULT_FROM_WIN32(GetLastError());
		CloseHandle(file);
		return result;
	}
	*destBytes = 0;
	size_t bytesRead = 0;
	while (ReadFile(file, readFileBuffer, 4095 * sizeof(wchar_t), (LPDWORD) &bytesRead, NULL) && bytesRead > 0) {
		auto newSize = *destBytes + bytesRead + 1 * sizeof(wchar_t);
		auto newCopy = (wchar_t*)LocalAlloc(LPTR, newSize);
		if (newCopy == NULL) {
			LocalFree(*dest);
			*dest = NULL;
			*destBytes = 0;
			auto result = HRESULT_FROM_WIN32(GetLastError());
			CloseHandle(file);
			return result;
		}
		if (*destBytes > 0) {
			memcpy(newCopy, *dest, *destBytes);
		}
		LocalFree(*dest);
		*dest = newCopy;
		memcpy((*dest + *destBytes), readFileBuffer, bytesRead);
		*destBytes += bytesRead;
	}
	CloseHandle(file);
	if (*dest == NULL) {
		*destBytes = 0;
		return E_FAIL;
	}
	*destBytes += sizeof(wchar_t);
	return S_OK;
}
